import {
  CreateReportDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';
import { AxiosInstance } from 'axios';

export function createReportsRouteHelper(client: AxiosInstance) {
  return {
    async getReports(params?: object) {
      return await client.get('/api/v1/reports/comments', { params });
    },

    async getReport(id: string) {
      return await client.get(`/api/v1/reports/comments/${id}`);
    },

    async createReport(reportData: Omit<CreateReportDto, 'reporterId'>) {
      const urlSearchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(reportData)) {
        if (value === undefined) {
          urlSearchParams.append(key, 'undefined');
        } else if (Array.isArray(value)) {
          // Encode arrays as repeated keys
          for (const v of value) {
            urlSearchParams.append(key, v);
          }
        } else {
          urlSearchParams.append(key, value.toString());
        }
      }

      return await client.post('/api/v1/reports/comments', urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async updateReport(
      id: string,
      reportData: Omit<UpdateReportDto, 'moderatorId' | 'reportId'>
    ) {
      const urlSearchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(reportData)) {
        if (value === undefined) {
          urlSearchParams.append(key, 'undefined');
        } else if (Array.isArray(value)) {
          // Encode arrays as repeated keys
          for (const v of value) {
            urlSearchParams.append(key, v);
          }
        } else {
          urlSearchParams.append(key, value.toString());
        }
      }
      return await client.patch(
        `/api/v1/reports/comments/${id}`,
        urlSearchParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    },

    async deleteReport(id: string) {
      return await client.delete(`/api/v1/reports/comments/${id}`);
    },
  };
}
