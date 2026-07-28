import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe, vi } from 'vitest';

import ReportsTable from './ReportsTable.svelte';
import {
  OMITTED_COLUMN_NAMES,
  REPORTS_EMPTY_MESSAGE,
  REPORTS_LOADING_MESSAGE,
  REPORTS_NO_RESULTS_MESSAGE,
  TABLE_COLUMNS,
} from '../shared/constants.js';
import { generateRandomCommentReports } from '@dans-coding-world/shared-report-testing';
import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

const admin = generateRandomUser({ id: 1, role: 'ADMIN' });
const moderator = generateRandomUser({ id: 2, role: 'MOD' });

it('renders successfully', async () => {
  const screen = await render(ReportsTable);
  expect(screen).toBeDefined();
});

it('renders as <table> element in a wrapper', async () => {
  const { container } = await render(ReportsTable);
  expect((container.firstChild?.firstChild as HTMLElement).tagName).toBe(
    'TABLE',
  );
});

it.each(TABLE_COLUMNS)(`table contains "%s" column`, async (col) => {
  await render(ReportsTable);
  const thead = page.getByRole('columnheader', {
    name: !OMITTED_COLUMN_NAMES.includes(col) ? col : '',
  });

  expect(thead).toBeDefined();
});

it('table has additional thead row containing controls (Filter & Sort)', async () => {
  await render(ReportsTable, { reports: [] });
  const table = page.getByRole('table');
  const controlRow = table.getByRole('row').all().slice(1)[0]; // skip primary header row

  expect(controlRow.getByLabelText(/sort by/i)).toBeInTheDocument();
  expect(controlRow.getByLabelText(/filter by/i)).toBeInTheDocument();
});

it('table displays empty message when no reports are passed', async () => {
  await render(ReportsTable, { reports: [] });
  expect(page.getByText(REPORTS_EMPTY_MESSAGE)).toBeInTheDocument();
});

it('table displays no results message when empty and filtering is active', async () => {
  await render(ReportsTable, {
    reports: [],
    params: { filterBy: { postId: 123 } },
  });
  expect(page.getByText(REPORTS_NO_RESULTS_MESSAGE)).toBeInTheDocument();
});

it('table displays "loading" message on `isLoading` prop set to true', async () => {
  await render(ReportsTable, { isLoading: true });
  expect(page.getByText(REPORTS_LOADING_MESSAGE)).toBeInTheDocument();
});

it('table displays error message on `error` prop populated', async () => {
  const error = new Error('Failed to fetch reports');
  await render(ReportsTable, { error });
  expect(page.getByText(new RegExp(error.message))).toBeInTheDocument();
});

describe('Rows', () => {
  const reports = generateRandomCommentReports(2);

  describe('Row columns', () => {
    it(`displays report reason in "Reason" column`, async () => {
      await render(ReportsTable, { reports });

      for (let i = 0; i < reports.length; i++) {
        const cell = getTableDataCell(i, TABLE_COLUMNS.indexOf('Reason'));
        expect(cell.getByText(reports[i].reason)).toBeInTheDocument();
      }
    });

    it(`displays report status in uppercase in "Status" column`, async () => {
      await render(ReportsTable, { reports });

      for (let i = 0; i < reports.length; i++) {
        const cell = getTableDataCell(i, TABLE_COLUMNS.indexOf('Status'));
        expect(
          cell.getByText(reports[i].status.toUpperCase()),
        ).toBeInTheDocument();
      }
    });

    it(`displays created date in DD/MM/YYYY format`, async () => {
      await render(ReportsTable, { reports });

      const colIndex = TABLE_COLUMNS.indexOf('Created Date');

      reports.forEach((report, rowIndex) => {
        const cell = getTableDataCell(rowIndex, colIndex);
        expect(
          cell.getByText(formatDateTo_DD_MM_YYYY(new Date(report.createdAt))),
        ).toBeInTheDocument();
      });
    });

    it(`displays actions "View" and "Delete" for logged-in viewer`, async () => {
      await render(ReportsTable, { reports, viewer: admin });

      const colIndex = TABLE_COLUMNS.indexOf('Actions');
      const cell = getTableDataCell(0, colIndex);
      const viewLink = cell.getByRole('link', { name: /view/i });
      const deleteButton = cell.getByRole('button', { name: /delete/i });

      expect(viewLink).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('disables actions if the moderator created the reported comment', async () => {
      const selfReportedCommentReport = generateRandomCommentReports(1, {
        reportedComment: { userId: moderator.id },
      })[0];

      await render(ReportsTable, {
        reports: [selfReportedCommentReport],
        viewer: moderator,
      });

      const colIndex = TABLE_COLUMNS.indexOf('Actions');
      const cell = getTableDataCell(0, colIndex);
      const deleteButton = cell.getByRole('button', { name: /delete/i });

      expect(deleteButton).toBeDisabled();
    });

    it('opens confirmation dialog on selecting "Delete" action', async () => {
      const mockDelete = vi.fn();
      const screen = await render(ReportsTable, {
        reports,
        viewer: admin,
        onReportDelete: mockDelete,
      });
      const reportTarget = reports[0];
      const colIndex = TABLE_COLUMNS.indexOf('Actions');
      const cell = getTableDataCell(0, colIndex);

      await cell.getByRole('button', { name: /delete/i }).click();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeVisible();

      await dialog.getByRole('button', { name: /delete/i }).click();
      expect(mockDelete).toHaveBeenCalledWith(reportTarget.id);
    });
  });

  describe('Expanded Row Details', () => {
    it('clicking "expand details" reveals row details panel', async () => {
      await render(ReportsTable, { reports });
      const reportTarget = reports[0];

      await expandRow(0);

      const expandedRow = page.getByTestId(`row-details-${reportTarget.id}`);
      expect(expandedRow).toBeInTheDocument();
      expect(
        expandedRow.getByText(`ID: ${reportTarget.id}`),
      ).toBeInTheDocument();
    });

    it('toggles collapse button and hides details panel when clicked again', async () => {
      await render(ReportsTable, { reports });
      const reportTarget = reports[0];

      await expandRow(0);

      const row = getTableRow(0);
      const collapseDetailsButton = row.getByRole('button', {
        name: /collapse details/i,
      });
      expect(collapseDetailsButton).toBeInTheDocument();

      await collapseDetailsButton.click();

      await expect
        .element(page.getByTestId(`row-details-${reportTarget.id}`))
        .not.toBeInTheDocument();
    });

    it('contains report reason and reported comment quote', async () => {
      const reportTarget = reports[0];
      await render(ReportsTable, { reports });

      await expandRow(0);

      const expandedRow = page.getByTestId(`row-details-${reportTarget.id}`);
      expect(expandedRow.getByText(reportTarget.reason)).toBeInTheDocument();
      expect(
        expandedRow.getByText(new RegExp(reportTarget.reportedComment.content)),
      ).toBeInTheDocument();
    });

    it('allows filtering by Post ID, Reported User ID, and Reporter ID from expanded row', async () => {
      const onParamsChange = vi.fn();
      const reportTarget = reports[0];

      await render(ReportsTable, { reports, onParamsChange });
      await expandRow(0);

      const expandedRow = page.getByTestId(`row-details-${reportTarget.id}`);

      // Click Post ID button
      const postIdButton = expandedRow.getByRole('button', {
        name: `#${reportTarget.reportedComment.postId}`,
      });
      await postIdButton.click();
      expect(onParamsChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filterBy: expect.objectContaining({
            postId: reportTarget.reportedComment.postId,
          }),
        }),
      );

      // Click Reported User button
      const reportedUserButton = expandedRow.getByRole('button', {
        name: `User #${reportTarget.reportedComment.userId}`,
      });
      await reportedUserButton.click();
      expect(onParamsChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filterBy: expect.objectContaining({
            maliciousUserId: reportTarget.reportedComment.userId,
          }),
        }),
      );

      // Click Reporter button
      const reporterButton = expandedRow.getByRole('button', {
        name: `User #${reportTarget.reporterId}`,
      });
      await reporterButton.click();
      expect(onParamsChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filterBy: expect.objectContaining({
            maliciousUserId: reportTarget.reporterId,
          }),
        }),
      );
    });
  });

  async function expandRow(rowIndex: number) {
    const row = getTableRow(rowIndex);
    const showDetailsToggle = row.getByRole('button', {
      name: /expand details/i,
    });
    await showDetailsToggle.click();
  }

  function getTableRow(rowIndex: number) {
    const table = page.getByRole('table');
    const rows = table.getByRole('row').all().slice(2); // skip thead row + control row
    if (rowIndex >= rows.length)
      throw new Error(
        `Row index bigger than available rows (${rowIndex} >= ${rows.length})`,
      );
    return rows[rowIndex];
  }

  function getTableDataCell(rowIndex: number, colIndex: number) {
    const cells = getTableRow(rowIndex).getByRole('cell').all();
    if (colIndex >= cells.length)
      throw new Error(
        `Col index bigger than available columns (${colIndex} >= ${cells.length})`,
      );
    return cells[colIndex];
  }
});
