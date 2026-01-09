import api from './api';

export interface Mailbox {
    id: string;
    name: string;
    unread_count: number;
}

export interface EmailListItem {
    id: string;
    subject: string;
    from: string;
    date: string;
    read: boolean;
    has_attachments: boolean;
}

export interface EmailAddress {
    name: string;
    email: string;
}

export interface EmailDetail {
    id: string;
    subject: string;
    from: EmailAddress;
    to: EmailAddress[];
    cc: EmailAddress[];
    bcc: EmailAddress[];
    date: string;
    body_html: string | null;
    body_text: string | null;
    attachments: Attachment[];
    thread_id: string | null;
}

export interface Attachment {
    id: string;
    filename: string;
    mime_type: string;
    size: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        has_more: boolean;
    };
}

export interface SendEmailData {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
}

export const emailService = {
    async getProviderStatus(): Promise<{
        connected: boolean;
        provider_type?: string;
        connected_at?: string;
    }> {
        const response = await api.get<{
            success: boolean;
            connected: boolean;
            provider_type?: string;
            connected_at?: string;
        }>('/email-provider/status');
        return {
            connected: response.data.connected,
            provider_type: response.data.provider_type,
            connected_at: response.data.connected_at,
        };
    },

    async getMailboxes(): Promise<Mailbox[]> {
        const response = await api.get<{ success: boolean; data: Mailbox[] }>('/mailboxes');
        return response.data.data;
    },

    async getEmails(mailboxId: string, page = 1, limit = 50): Promise<PaginatedResponse<EmailListItem>> {
        const response = await api.get<{
            success: boolean;
            data: EmailListItem[];
            pagination: {
                current_page: number;
                per_page: number;
                total: number;
                last_page: number;
                has_more: boolean;
            };
        }>(
            `/mailboxes/${mailboxId}/emails`,
            {
                params: { page, limit },
            }
        );
        return {
            data: response.data.data,
            pagination: response.data.pagination,
        };
    },

    async getEmailDetail(emailId: string): Promise<EmailDetail> {
        const response = await api.get<{ success: boolean; data: EmailDetail }>(`/emails/${emailId}`);
        return response.data.data;
    },

    async sendEmail(data: SendEmailData): Promise<string> {
        const response = await api.post<{ success: boolean; data: { id: string } }>('/emails/send', data);
        return response.data.data.id;
    },

    async replyEmail(emailId: string, body: string, subject?: string): Promise<string> {
        const response = await api.post<{ success: boolean; data: { id: string } }>(`/emails/${emailId}/reply`, {
            body,
            subject,
        });
        return response.data.data.id;
    },

    async forwardEmail(emailId: string, recipients: string[], message?: string): Promise<string> {
        const response = await api.post<{ success: boolean; data: { id: string } }>(`/emails/${emailId}/forward`, {
            to: recipients,
            message,
        });
        return response.data.data.id;
    },

    async modifyEmail(emailId: string, actions: { read?: boolean; starred?: boolean; delete?: boolean }): Promise<void> {
        await api.post(`/emails/${emailId}/modify`, actions);
    },

    async downloadAttachment(emailId: string, attachmentId: string, filename: string): Promise<void> {
        const response = await api.get(`/emails/${emailId}/attachments/${attachmentId}`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async searchEmails(
        query: string,
        filters: { unread_only?: boolean; has_attachments?: boolean } = {},
        page = 1,
        limit = 50
    ): Promise<PaginatedResponse<EmailListItem>> {
        const response = await api.get<{
            success: boolean;
            data: EmailListItem[];
            pagination: {
                current_page: number;
                per_page: number;
                total: number;
                last_page: number;
                has_more: boolean;
            };
        }>('/emails/search', {
            params: { query, ...filters, page, limit },
        });
        return {
            data: response.data.data,
            pagination: response.data.pagination,
        };
    },

    async connectGmail(): Promise<string> {
        const response = await api.get<{ success: boolean; auth_url: string }>('/auth/google/authorize');
        return response.data.auth_url;
    },

    async handleGmailCallback(code: string, state: string): Promise<void> {
        await api.post('/auth/google/callback', { code, state });
    },

    async disconnectProvider(): Promise<void> {
        await api.post('/email-provider/disconnect');
    },
};
