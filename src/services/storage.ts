import { User, InventoryItem, Report, Client, Visit, Message } from '../types';
import { supabase } from './supabaseClient';

// Initial Data Seeding (Fallback) - Cleared for production
const SEED_USERS: User[] = [];

export const StorageService = {
    // Sync Logic
    syncWithSupabase: async () => {
        const hasSynced = localStorage.getItem('supabase_synced');
        if (hasSynced) return;

        console.log('Starting sync with Supabase...');
        try {
            // Check if profiles table is empty before seeding
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            if (count === 0) {
                console.log('Database is empty. Please register the first administrator.');
            }

            // Sync Clients from local if any
            const localClients: Client[] = JSON.parse(localStorage.getItem('app_clients') || '[]');
            if (localClients.length > 0) {
                await supabase.from('clients').upsert(localClients.map(c => ({
                    id: c.id,
                    name: c.name,
                    nit: c.nit,
                    photo_url: c.photoUrl,
                    initials: c.initials,
                    contact_name: c.contactName,
                    email: c.email,
                    phone: c.phone,
                    address: c.address,
                    status: c.status,
                    total_visits: c.totalVisits,
                    last_visit_date: c.lastVisitDate,
                    color_class: c.colorClass
                })));
            }

            // Sync Inventory
            const localInv: InventoryItem[] = JSON.parse(localStorage.getItem('app_inventory') || '[]');
            if (localInv.length > 0) {
                await supabase.from('inventory_items').upsert(localInv.map(i => ({
                    id: i.id,
                    name: i.name,
                    description: i.description,
                    serial_number: i.serialNumber,
                    image_url: i.imageUrl,
                    status: i.status,
                    history: i.history || [],
                    maintenance_log: i.maintenanceLog || [],
                    status_logs: i.statusLogs || []
                })));
            }

            localStorage.setItem('supabase_synced', 'true');
            console.log('Sync complete!');
        } catch (e) {
            console.error('Sync failed', e);
        }
    },

    // Users
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            console.error('Error fetching users', error);
            return JSON.parse(localStorage.getItem('app_users') || JSON.stringify(SEED_USERS));
        }
        return data.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            phone: u.phone,
            position: u.position,
            avatarUrl: u.avatar_url,
            emailVerified: u.email_verified,
            phoneVerified: u.phone_verified
        }));
    },

    addUser: async (user: User, initialPassword?: string) => {
        await supabase.from('profiles').insert({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            position: user.position,
            avatar_url: user.avatarUrl,
            email_verified: user.emailVerified || false,
            phone_verified: user.phoneVerified || false
        });
        localStorage.setItem(`pwd_${user.email}`, initialPassword || '123456');
    },

    updateUser: async (updatedUser: User) => {
        await supabase.from('profiles').update({
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            phone: updatedUser.phone,
            position: updatedUser.position,
            avatar_url: updatedUser.avatarUrl,
            email_verified: updatedUser.emailVerified,
            phone_verified: updatedUser.phoneVerified
        }).eq('id', updatedUser.id);
    },

    updatePassword: async (userId: string, newPassword: string) => {
        await supabase.from('profiles').update({
            password: newPassword
        }).eq('id', userId);
    },

    toggleVerification: async (userId: string, field: 'email' | 'phone', value: boolean) => {
        const updateData = field === 'email'
            ? { email_verified: value }
            : { phone_verified: value };

        await supabase.from('profiles').update(updateData).eq('id', userId);
    },

    deleteUser: async (userId: string) => {
        const { data } = await supabase.from('profiles').select('email').eq('id', userId).single();
        if (data) localStorage.removeItem(`pwd_${data.email}`);
        await supabase.from('profiles').delete().eq('id', userId);
    },

    login: async (email: string, password: string): Promise<User | null> => {
        // Try DB login first (multi-device support)
        const { data, error } = await supabase.from('profiles')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (data) {
            return {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                phone: data.phone,
                position: data.position,
                avatarUrl: data.avatar_url,
                emailVerified: data.email_verified,
                phoneVerified: data.phone_verified
            };
        }

        // Fallback to legacy local login for older sessions
        const storedPassword = localStorage.getItem(`pwd_${email}`);
        if (storedPassword && storedPassword === password) {
            const { data: legacyData } = await supabase.from('profiles').select('*').eq('email', email).single();
            if (legacyData) {
                return {
                    id: legacyData.id,
                    name: legacyData.name,
                    email: legacyData.email,
                    role: legacyData.role,
                    phone: legacyData.phone,
                    position: legacyData.position,
                    avatarUrl: legacyData.avatar_url,
                    emailVerified: legacyData.email_verified || false,
                    phoneVerified: legacyData.phone_verified || false
                };
            }
        }
        return null;
    },

    // Clients
    getClients: async (): Promise<Client[]> => {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) return [];
        return data.map(c => ({
            id: c.id,
            name: c.name,
            nit: c.nit,
            photoUrl: c.photo_url,
            initials: c.initials,
            contactName: c.contact_name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            status: c.status,
            totalVisits: c.total_visits,
            lastVisitDate: c.last_visit_date,
            colorClass: c.color_class
        } as Client));
    },

    addClient: async (client: Client) => {
        const { data: existing } = await supabase.from('clients').select('id');
        if (!client.id || (existing && existing.some(c => c.id === client.id))) {
            const count = (existing?.length || 0) + 1;
            client.id = `CL-${String(count).padStart(3, '0')}`;
        }
        await supabase.from('clients').insert({
            id: client.id,
            name: client.name,
            nit: client.nit,
            photo_url: client.photoUrl,
            initials: client.initials,
            contact_name: client.contactName,
            email: client.email,
            phone: client.phone,
            address: client.address,
            status: client.status,
            total_visits: client.totalVisits,
            last_visit_date: client.lastVisitDate,
            color_class: client.colorClass
        });
    },

    addClientsBulk: async (newClients: Partial<Client>[]) => {
        const { data: existingClients } = await supabase.from('clients').select('*');
        const clients = (existingClients || []).map(c => ({
            id: c.id,
            name: c.name,
            nit: c.nit,
            photoUrl: c.photo_url,
            initials: c.initials,
            contactName: c.contact_name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            status: c.status,
            totalVisits: c.total_visits,
            lastVisitDate: c.last_visit_date,
            colorClass: c.color_class
        })) as Client[];

        let createdCount = 0;
        let updatedCount = 0;
        const colors = [
            'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
            'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
            'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
            'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50'
        ];

        let maxId = 0;
        clients.forEach(c => {
            const num = parseInt(c.id.replace('CL-', ''));
            if (!isNaN(num) && num > maxId) maxId = num;
        });

        const upsertData: any[] = [];

        newClients.forEach(c => {
            const existingIndex = clients.findIndex(existing =>
                (c.nit && existing.nit === c.nit) ||
                (c.email && existing.email === c.email)
            );

            if (existingIndex !== -1) {
                const existing = clients[existingIndex];
                upsertData.push({
                    id: existing.id,
                    name: c.name || existing.name,
                    nit: c.nit || existing.nit,
                    photo_url: c.photoUrl || existing.photoUrl,
                    initials: c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : existing.initials,
                    contact_name: c.contactName || existing.contactName,
                    email: c.email || existing.email,
                    phone: c.phone || existing.phone,
                    address: c.address || existing.address,
                    status: existing.status,
                    total_visits: existing.totalVisits,
                    last_visit_date: existing.lastVisitDate,
                    color_class: existing.colorClass
                });
                updatedCount++;
            } else {
                maxId++;
                const newId = `CL-${String(maxId).padStart(3, '0')}`;
                upsertData.push({
                    id: newId,
                    name: c.name || 'Sin Nombre',
                    nit: c.nit || '',
                    photo_url: c.photoUrl || '',
                    initials: c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'XX',
                    contact_name: c.contactName || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    address: c.address || '',
                    status: 'Active',
                    total_visits: 0,
                    last_visit_date: '-',
                    color_class: colors[Math.floor(Math.random() * colors.length)]
                });
                createdCount++;
            }
        });

        if (upsertData.length > 0) {
            await supabase.from('clients').upsert(upsertData);
        }

        return { created: createdCount, updated: updatedCount };
    },

    updateClient: async (updatedClient: Client) => {
        await supabase.from('clients').update({
            name: updatedClient.name,
            nit: updatedClient.nit,
            photo_url: updatedClient.photoUrl,
            initials: updatedClient.initials,
            contact_name: updatedClient.contactName,
            email: updatedClient.email,
            phone: updatedClient.phone,
            address: updatedClient.address,
            status: updatedClient.status,
            total_visits: updatedClient.totalVisits,
            last_visit_date: updatedClient.lastVisitDate,
            color_class: updatedClient.colorClass
        }).eq('id', updatedClient.id);
    },

    deleteClient: async (clientId: string) => {
        await supabase.from('clients').delete().eq('id', clientId);
    },

    // Visits
    getVisits: async (): Promise<Visit[]> => {
        const { data, error } = await supabase.from('visits').select('*').order('created_at', { ascending: false });
        if (error) return [];
        return data.map(v => ({
            id: v.id,
            clientId: v.client_id,
            clientName: v.client_name,
            supervisorId: v.supervisor_id,
            supervisorName: v.supervisor_name,
            status: v.status,
            date: v.date,
            type: v.type,
            notes: v.notes,
            createdBy: v.created_by,
            creatorName: v.creator_name,
            hasReport: v.has_report,
            interviewSummary: v.interview_summary,
            observations: v.observations || [],
            photos: v.photos || [],
            completedDate: v.completed_date,
            completedAt: v.completed_at
        } as Visit));
    },

    getVisitById: async (id: string): Promise<Visit | undefined> => {
        const { data } = await supabase.from('visits').select('*').eq('id', id).single();
        if (!data) return undefined;
        return {
            id: data.id,
            clientId: data.client_id,
            clientName: data.client_name,
            supervisorId: data.supervisor_id,
            supervisorName: data.supervisor_name,
            status: data.status,
            date: data.date,
            type: data.type,
            notes: data.notes,
            createdBy: data.created_by,
            creatorName: data.creator_name,
            hasReport: data.has_report,
            interviewSummary: data.interview_summary,
            observations: data.observations || [],
            photos: data.photos || [],
            completedDate: data.completed_date,
            completedAt: data.completed_at
        } as Visit;
    },

    addVisit: async (visit: Visit) => {
        const visitId = visit.id || `VST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
        await supabase.from('visits').insert({
            id: visitId,
            client_id: visit.clientId,
            client_name: visit.clientName,
            supervisor_id: visit.supervisorId,
            supervisor_name: visit.supervisorName,
            status: visit.status,
            date: visit.date,
            type: visit.type,
            notes: visit.notes,
            created_by: visit.createdBy,
            creator_name: visit.creatorName,
            has_report: visit.hasReport
        });
    },

    updateVisit: async (updatedVisit: Visit) => {
        await supabase.from('visits').update({
            status: updatedVisit.status,
            interview_summary: updatedVisit.interviewSummary,
            observations: updatedVisit.observations,
            photos: updatedVisit.photos,
            has_report: updatedVisit.hasReport,
            completed_date: updatedVisit.completedDate,
            completed_at: updatedVisit.completedAt
        }).eq('id', updatedVisit.id);
    },

    // Inventory
    getInventory: async (): Promise<InventoryItem[]> => {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error) return [];
        return data.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description,
            serialNumber: i.serial_number,
            imageUrl: i.image_url,
            status: i.status,
            history: i.history || [],
            maintenanceLog: i.maintenance_log || i.maintenanceLog || [],
            statusLogs: i.status_logs || i.statusLogs || []
        }));
    },

    addInventoryItem: async (item: InventoryItem) => {
        await supabase.from('inventory_items').insert({
            id: item.id,
            name: item.name,
            description: item.description,
            serial_number: item.serialNumber,
            image_url: item.imageUrl,
            status: item.status,
            history: item.history || [],
            maintenance_log: item.maintenanceLog || [],
            status_logs: item.statusLogs || []
        });
    },

    updateInventoryItem: async (updatedItem: InventoryItem) => {
        await supabase.from('inventory_items').update({
            name: updatedItem.name,
            description: updatedItem.description,
            serial_number: updatedItem.serialNumber,
            image_url: updatedItem.imageUrl,
            status: updatedItem.status,
            history: updatedItem.history,
            maintenance_log: updatedItem.maintenanceLog,
            status_logs: updatedItem.statusLogs
        }).eq('id', updatedItem.id);
    },

    deleteInventoryItem: async (itemId: string) => {
        await supabase.from('inventory_items').delete().eq('id', itemId);
    },

    addInventoryBulk: async (newItems: Partial<InventoryItem>[]) => {
        const { data: existing } = await supabase.from('inventory_items').select('serial_number');
        const existingSerials = new Set((existing || []).map(i => i.serial_number));

        const toInsert = newItems.filter(item => item.serialNumber && !existingSerials.has(item.serialNumber));

        if (toInsert.length > 0) {
            await supabase.from('inventory_items').insert(toInsert.map(i => ({
                id: i.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: i.name,
                description: i.description,
                serial_number: i.serialNumber,
                image_url: i.imageUrl,
                status: i.status || 'Disponible',
                history: [],
                maintenance_log: [],
                status_logs: []
            })));
        }

        return { created: toInsert.length, skipped: newItems.length - toInsert.length };
    },

    // Reports 
    getReports: async (clientId: string): Promise<Report[]> => {
        const { data: visits } = await supabase.from('visits')
            .select('*')
            .eq('client_id', clientId)
            .eq('status', 'Completed');

        const visitReports: Report[] = (visits || []).map(v => ({
            id: v.id,
            clientId: v.client_id,
            title: `Reporte: ${v.type}`,
            date: v.completed_date || v.date,
            type: v.type,
            url: `/visit-details/${v.id}`
        }));

        const { data: reports } = await supabase.from('reports').select('*').eq('client_id', clientId);
        const otherReports: Report[] = (reports || []).map(r => ({
            id: r.id,
            clientId: r.client_id,
            title: r.title,
            date: r.date,
            type: r.type,
            url: r.url
        }));

        return [...visitReports, ...otherReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    // Messages
    getMessages: async (): Promise<Message[]> => {
        const { data, error } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
        if (error) return [];
        return data.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            attachmentUrl: m.attachment_url,
            attachmentType: m.attachment_type as any,
            timestamp: m.timestamp,
            read: m.read
        }));
    },

    sendMessage: async (msg: Message) => {
        await supabase.from('messages').insert({
            sender_id: msg.senderId,
            receiver_id: msg.receiverId,
            text: msg.text,
            attachment_url: msg.attachmentUrl,
            attachment_type: msg.attachmentType,
            read: msg.read
        });
    }
};