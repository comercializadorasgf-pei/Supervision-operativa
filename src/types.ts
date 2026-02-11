export interface User {
    id: string;
    name: string;
    email: string;
    role: 'developer' | 'supervisor';
    phone: string;
    position: string;
    avatarUrl?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
}

export interface Client {
    id: string;
    name: string;
    nit?: string;
    photoUrl?: string;
    initials: string;
    contactName: string;
    email: string;
    phone?: string;
    address?: string;
    status: 'Active' | 'Inactive' | 'Retirado' | 'Pendiente';
    totalVisits: number;
    lastVisitDate: string;
    colorClass?: string;
    created_at?: string;
}

export interface Observation {
    id: string;
    title: string;
    severity: 'High' | 'Medium' | 'Low';
    description: string;
}

export interface Visit {
    id: string;
    clientId: string;
    clientName: string;
    clientPhotoUrl?: string;
    clientNit?: string;
    supervisorId: string;
    supervisorName: string;
    status: 'Completed' | 'Pending' | 'In Progress' | 'Cancelled';
    date: string;
    type: string;
    notes?: string;

    // Management fields
    cancelReason?: string;
    rescheduleReason?: string;
    originalDate?: string;

    // Creation Tracking
    createdBy: string; // User ID
    creatorName: string;

    hasReport: boolean;
    // Fields filled during execution
    interviewSummary?: string;
    observations?: Observation[];
    photos?: string[];
    completedDate?: string;
    completedAt?: string; // ISO String for Date + Time with seconds
    created_at?: string;
}

export type InventoryStatus = 'Disponible' | 'Asignado' | 'En Taller' | 'Inactivo';

export interface AssignmentDetails {
    clientId?: string; // Link to Client ID
    post: string; // This will store Client Name
    date: string; // Start Date
    endDate?: string; // Calculated or stored when status changes
    supervisorName: string;
    operatorName: string;
    supervisorSignature: string;
    operatorSignature: string;
    observations?: string;
    evidenceUrl?: string; // Photo evidence of assignment
}

export interface MaintenanceRecord {
    id: string;
    date: string; // ISO with time
    workshopName: string;
    receiverName: string;
    reason: string;
    observations: string;
    photoUrl?: string;
}

export interface StatusLog {
    id: string;
    date: string; // ISO string with time
    previousStatus: InventoryStatus;
    newStatus: InventoryStatus;
    changedBy: string; // User name
    reason: string; // Short description (e.g., "Asignado a Juan", "Enviado a Taller")
}

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    serialNumber: string;
    imageUrl: string;
    status: InventoryStatus;
    assignment?: AssignmentDetails;
    history?: AssignmentDetails[];
    maintenanceLog?: MaintenanceRecord[];
    statusLogs?: StatusLog[]; // New comprehensive history
}

export interface Report {
    id: string;
    clientId: string;
    title: string;
    date: string;
    type: string;
    url: string;
}

export interface DailyStat {
    day: string;
    value: number;
}

// New Types for Messages
export interface Message {
    id: string;
    senderId: string;
    receiverId: string; // 'group' or userId
    text: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'file';
    timestamp: string;
    read: boolean;
}

export interface ChatSession {
    userId: string;
    userName: string;
    userAvatar: string;
    lastMessage: string;
    lastTime: string;
    unread: number;
}