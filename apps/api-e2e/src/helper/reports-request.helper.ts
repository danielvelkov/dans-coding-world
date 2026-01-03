import {
  API_ENDPOINTS,
  ApiClient,
  toURLSearchParams,
} from '@dans-coding-world/shared-data-access-api';
import {
  CreateReportDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';
import { urlEncodedHeaders } from './common.helper';

export function createReportsRouteHelper(client: ApiClient) {
  return {
    getReports(params?: object) {
      return client.get(API_ENDPOINTS.REPORTS.COMMENTS.LIST, { params });
    },

    getReport(id: string) {
      return client.get(API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(+id));
    },

    createReport(reportData: Omit<CreateReportDto, 'reporterId'>) {
      const urlSearchParams = toURLSearchParams(reportData);
      return client.post(API_ENDPOINTS.REPORTS.COMMENTS.LIST, urlSearchParams, {
        headers: urlEncodedHeaders,
      });
    },

    updateReport(
      id: string,
      reportData: Omit<UpdateReportDto, 'moderatorId' | 'reportId'>
    ) {
      const urlSearchParams = toURLSearchParams(reportData);
      return client.patch(
        API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(+id),
        urlSearchParams,
        {
          headers: urlEncodedHeaders,
        }
      );
    },

    deleteReport(id: string) {
      return client.delete(API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(+id));
    },
  };
}
