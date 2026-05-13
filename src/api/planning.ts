import { api } from './client'
import type { MeetingPlan, MeetingPlanSummary, PlanBlock, PlanTemplate } from '@/types'

export const planningApi = {
  // Plans
  getPlans: (groupId: number) =>
    api.get<MeetingPlanSummary[]>(`/groups/${groupId}/plans`).then((r) => r.data),

  getPlan: (groupId: number, date: string) =>
    api.get<MeetingPlan>(`/groups/${groupId}/plans/date/${date}`)
      .then((r) => r.data)
      .catch(() => null),

  savePlan: (groupId: number, data: {
    meetingDate: string
    appliedTemplateName: string | null
    blocks: Omit<PlanBlock, 'id'>[]
  }) => api.post<MeetingPlan>(`/groups/${groupId}/plans`, data).then((r) => r.data),

  // Templates
  getTemplates: () =>
    api.get<PlanTemplate[]>('/plan-templates').then((r) => r.data),

  createTemplate: (data: { name: string; blocks: Omit<PlanBlock, 'id'>[] }) =>
    api.post<PlanTemplate>('/plan-templates', data).then((r) => r.data),

  deleteTemplate: (id: number) =>
    api.delete(`/plan-templates/${id}`),
}
