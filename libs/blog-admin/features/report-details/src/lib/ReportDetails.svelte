<script lang="ts">
  import {
    createEditReportMutation,
    createDeleteReportMutation,
    createDeleteCommentMutation,
    createUpdateUserBanStatusMutation,
  } from '@dans-coding-world/blog-admin-data-access-operations';
  import {
    Button,
    Modal,
    ReportStatusPill,
    SpinnerLoader,
  } from '@dans-coding-world/blog-admin-ui-common';
  import { REPORT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
  import type { ReportDetailExtended } from '@dans-coding-world/report-data-access';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import moment from 'moment';
  import ReportHistoryList from './components/ReportHistoryList.svelte';
  import {
    DEFAULT_REPORT_STATUS_NOTES,
    type ReportAction,
  } from './shared/report-details.constants.js';

  const blogURL = __PUBLIC_BLOG_URL__;
  let errorEl: HTMLElement | null = null;

  let currentAction: ReportAction | null = $state(null);
  let customNoteInput = $state('');

  const {
    report,
    onReportEdit,
    onReportDelete,
    onCommentDelete,
    onReportedUserStatusChange,
    loggedInUser,
  }: {
    report: ReportDetailExtended;
    onReportEdit: (editedReport: ReportDetailExtended) => void;
    onReportDelete: (deletedReport: NonNullable<typeof report>) => void;
    onCommentDelete: (
      deletedComment: ReportDetailExtended['reportedComment'],
    ) => void;
    onReportedUserStatusChange: (
      user: Omit<ReportDetailExtended['reportedComment']['user'], 'password'>,
    ) => void;
    loggedInUser: Omit<UserDetail, 'password'>;
  } = $props();

  // Queries
  // Edit report
  const createEditReportMutationQuery = $derived(
    createEditReportMutation(report.id, { throwOnError: false }),
  );
  const mutateReportStatus = $derived(createEditReportMutationQuery.mutate);
  const changeReportStatusError = $derived(createEditReportMutationQuery.error);
  const isChangingStatus = $derived(createEditReportMutationQuery.isPending);

  // Delete report
  const createDeleteReportMutationQuery = $derived(
    createDeleteReportMutation(),
  );
  const mutateDeleteReport = $derived(createDeleteReportMutationQuery.mutate);
  const deleteReportError = $derived(createDeleteReportMutationQuery.error);
  const isDeletingReport = $derived(createDeleteReportMutationQuery.isPending);

  // Delete comment
  const createDeleteCommentMutationQuery = $derived(
    createDeleteCommentMutation(),
  );
  const mutateDeleteComment = $derived(createDeleteCommentMutationQuery.mutate);
  const deleteCommentError = $derived(createDeleteCommentMutationQuery.error);
  const isDeletingComment = $derived(
    createDeleteCommentMutationQuery.isPending,
  );

  // Update user ban status
  const createUpdateUserBanStatusMutationQuery = $derived(
    createUpdateUserBanStatusMutation(),
  );
  const mutateUserBanStatus = $derived(
    createUpdateUserBanStatusMutationQuery.mutate,
  );
  const banUserError = $derived(createUpdateUserBanStatusMutationQuery.error);
  const isBanning = $derived(createUpdateUserBanStatusMutationQuery.isPending);

  const activeError = $derived(
    changeReportStatusError ||
      deleteReportError ||
      deleteCommentError ||
      banUserError,
  );

  $effect(() => {
    if (activeError) {
      closeModal();

      queueMicrotask(() => {
        errorEl?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }
  });

  // Flags
  const isInactiveForDays = $derived.by(() => {
    if (report && report.history.length) {
      const lastEntry = report.history[report.history.length - 1];
      const startDate = moment(lastEntry.changedAt);
      const endDate = moment();
      let daysDifference = endDate.diff(startDate, 'days');
      return daysDifference >= 3; // if 3 days passed since last report change
    }
    return false;
  });

  const isReportedUserBanned = $derived(report.reportedComment.user.isBanned);
  const canBanUser = $derived(
    loggedInUser &&
      ((report.reportedComment.user.id !== loggedInUser.id &&
        report.reportedComment.user.role !== 'ADMIN' &&
        report.reportedComment.user.role !== 'MOD') ||
        loggedInUser.role === 'ADMIN'),
  );

  // Modal Handlers
  function closeModal() {
    currentAction = null;
    customNoteInput = '';
  }

  function handleConfirmStatusChange(
    targetStatus: ReportDetailExtended['status'],
  ) {
    const finalNote =
      customNoteInput.trim() ||
      DEFAULT_REPORT_STATUS_NOTES[targetStatus](report.id, { ...loggedInUser });
    mutateReportStatus(
      { status: targetStatus, note: finalNote },
      {
        onSuccess: (data) => {
          if (data?.report) onReportEdit(data.report as ReportDetailExtended);
          closeModal();
        },
      },
    );
  }

  function handleConfirmDeleteComment() {
    mutateDeleteComment(
      {
        commentId: report.reportedComment.id,
        postId: report.reportedComment.postId,
        authorId: report.reportedComment.userId,
      },
      {
        onSuccess: () => {
          onCommentDelete(report.reportedComment);
          closeModal();
        },
      },
    );
  }

  function handleConfirmToggleBan() {
    mutateUserBanStatus(
      {
        userToChangeId: report.reportedComment.user.id,
        isBanned: !isReportedUserBanned,
      },
      {
        onSuccess: (data) => {
          closeModal();
          if (data?.user) onReportedUserStatusChange(data.user);
        },
      },
    );
  }

  function handleConfirmDeleteReport() {
    mutateDeleteReport(
      { reportId: report.id },
      {
        onSuccess: () => {
          closeModal();
          onReportDelete(report);
        },
      },
    );
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <h2 class="text-3xl font-bold">Report</h2>
  <span class="text-sm text-(--color-text-tertiary)">ID: {report.id}</span>
</div>

{#if activeError}
  <div
    bind:this={errorEl}
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    data-testid="report-error"
    class="py-4"
  >
    <span class="text-sm text-(--color-error) sm:truncate">
      <i class="fa fa-warning"></i>
      {activeError}
    </span>
  </div>
{/if}

<div class="grid sm:grid-cols-2 grid-cols-1 gap-4 grid-flow-row">
  <!-- Comment details -->
  <div
    class="bg-(--color-bg-elevated) border border-(--color-border-subtle) rounded-lg self-start"
  >
    <div
      class="p-4 bg-(--color-bg-surface) border-b border-(--color-border-subtle)
       flex items-center gap-4"
    >
      <div class="flex items-center gap-2">
        <i class="fa fa-comment text-(--color-text-tertiary)"></i>
        <h3 class="text-base font-bold text-(--color-text-primary)">Comment</h3>
      </div>
      <div class="flex flex-1 flex-wrap items-center justify-between text-sm">
        <a
          href={`${blogURL}/blog/${report.reportedComment.postId}`}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-link) hover:underline"
        >
          <span>View Live Post</span>
          <i class="fa fa-external-link"></i>
        </a>

        <div>
          <span class="text-sm text-(--color-text-tertiary) font-medium"
            >Made by:</span
          >
          <a
            class="text-(--color-link) hover:text-(--color-link-hover)
           hover:underline font-medium"
            aria-label="See more reports about user"
            href={`/reports/comments?filterBy[maliciousUserId]=${report.reportedComment.userId}`}
            >{report.reportedComment.user.username}</a
          >
        </div>
      </div>
    </div>

    <div class="p-4 h-full">
      <p
        class="h-fit p-3 text-(--color-text-secondary) bg-(--color-bg-surface)
         border-2 border-(--color-border-emphasis) rounded-lg italic wrap-break-word w-full"
      >
        "{report.reportedComment.content}"
      </p>
    </div>
  </div>

  <!-- Report History -->
  <div
    data-testid="history-container"
    class="bg-(--color-bg-elevated) border border-(--color-border-subtle)
     rounded-xl overflow-hidden shadow-xs"
  >
    <div
      class="p-4 bg-(--color-bg-surface) border-b border-(--color-border-subtle)
       flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <i class="fa fa-history text-(--color-text-tertiary)"></i>
        <h3 class="text-base font-bold text-(--color-text-primary)">
          Report History
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-(--color-text-tertiary) font-medium"
          >Current Status:</span
        >
        <ReportStatusPill status={report.status} />
      </div>
    </div>
    <ReportHistoryList {report}></ReportHistoryList>
  </div>

  <!-- Moderation Actions -->
  <div
    class="sm:col-span-2 mt-4 bg-(--color-bg-elevated) border
     border-(--color-border-subtle) rounded-lg shadow-xs max-w-fit justify-self-center"
  >
    <div
      class="p-4 bg-(--color-bg-surface) border-b border-(--color-border-subtle) flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <i class="fa fa-gavel text-(--color-text-tertiary)"></i>
        <h3 class="text-base font-bold text-(--color-text-primary)">
          Moderation Actions
        </h3>
      </div>
    </div>

    <div class="p-5 space-y-6">
      <!-- NOTICE: Inactivity Banner -->
      {#if report.status === 'REVIEWING' && isInactiveForDays}
        <div
          class="p-3 rounded-lg flex items-center gap-2.5 text-xs bg-(--color-warning-bg) text-(--color-warning)"
        >
          <i class="fa fa-clock"></i>
          <span>A moderator has not acted on this report in over 3 days.</span>
        </div>
      {/if}

      <div class="space-y-2">
        <label
          for="status-selector"
          class="text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider block"
        >
          Update Report Status
        </label>

        {#if report.reportedComment.userId === loggedInUser.id}
          <div
            class="p-3 rounded-lg flex items-center gap-2.5 text-xs bg-(--color-warning-bg) text-(--color-warning)"
          >
            <i class="fa fa-clock"></i>
            <span
              >This report is about <b>YOU</b>, the admin. Not much you can do
              except delete it.</span
            >
          </div>
        {:else}
          <div class="flex items-center flex-wrap justify-evenly gap-2">
            <Button
              type="button"
              disabled={report.status === 'PENDING'}
              data-testid={`action-PENDING`}
              onclick={() =>
                (currentAction = {
                  type: 'CHANGE_STATUS',
                  targetStatus: 'PENDING',
                })}
              class="rounded-lg text-xs font-medium border transition-colors flex items-center
               gap-1 disabled:cursor-not-allowed border-transparent shadow-xs"
            >
              <i class="fa fa-clock text-[10px]"></i>
              Mark Pending
            </Button>

            <Button
              type="button"
              disabled={report.status === 'REVIEWING'}
              data-testid={`action-REVIEWING`}
              onclick={() =>
                (currentAction = {
                  type: 'CHANGE_STATUS',
                  targetStatus: 'REVIEWING',
                })}
              class="rounded-lg text-xs font-medium border transition-colors flex items-center
               gap-1 disabled:cursor-not-allowed border-transparent shadow-xs"
            >
              <i class="fa fa-eye text-[10px]"></i>
              Start Reviewing
            </Button>

            <Button
              type="button"
              disabled={report.status === 'DISMISSED'}
              data-testid={`action-DISMISSED`}
              onclick={() =>
                (currentAction = {
                  type: 'CHANGE_STATUS',
                  targetStatus: 'DISMISSED',
                })}
              class="rounded-lg text-xs font-medium border transition-colors flex items-center
               gap-1 disabled:cursor-not-allowed border-transparent shadow-xs"
            >
              <i class="fa fa-ban text-[10px]"></i>
              Dismiss Report
            </Button>

            <Button
              type="button"
              disabled={report.status === 'RESOLVED'}
              data-testid={`action-RESOLVED`}
              onclick={() =>
                (currentAction = {
                  type: 'CHANGE_STATUS',
                  targetStatus: 'RESOLVED',
                })}
              class="sm:ml-auto rounded-lg text-xs font-medium border transition-colors flex items-center
               gap-1 disabled:cursor-not-allowed border-transparent shadow-xs"
            >
              <i class="fa fa-check"></i>
              Resolve Report...
            </Button>
          </div>
        {/if}
      </div>

      <hr class="border-(--color-border-subtle)" />

      <!-- Zone 2: Direct Actions & Safeguards -->
      <label
        for="quick-actions"
        class="text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider block mb-2"
      >
        Quick actions
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Direct Content Action -->
        <div
          class="p-3 bg-(--color-bg-surface) border
           border-(--color-border-subtle) rounded-lg flex items-center justify-between gap-3"
        >
          <div>
            <p class="text-xs font-bold text-(--color-text-primary)">
              Delete Content
            </p>
            <p class="text-[11px] text-(--color-text-tertiary)">
              Removes comment and its reply tree.
            </p>
            <p class="text-[11px] font-semibold text-(--color-warning)">
              *Also deletes all reports regarding comment, including this one
            </p>
          </div>
          <Button
            type="button"
            onclick={() => (currentAction = { type: 'DELETE_COMMENT' })}
            class="px-2.5 py-1.5 rounded-md! text-xs font-medium bg-(--color-bg-surface) hover:bg-(--color-error-bg)
                   text-(--color-error)! border border-(--color-error-border) transition-colors shrink-0"
          >
            Delete Comment
          </Button>
        </div>

        <!-- Direct User Moderation -->
        {#if canBanUser}
          <div
            class="p-3 bg-(--color-bg-surface) border border-(--color-border-subtle) rounded-lg flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-xs font-bold text-(--color-text-primary)">
                User Restrictions
              </p>
              <p class="text-[11px] text-(--color-text-tertiary)">
                {isReportedUserBanned
                  ? 'User is currently suspended.'
                  : 'Restrict user platform access.'}
              </p>
              <p class="text-[11px] font-semibold text-(--color-warning)">
                *Cannot restrict admins or mods
              </p>
            </div>
            <Button
              type="button"
              onclick={() => (currentAction = { type: 'TOGGLE_BAN' })}
              class="px-2.5 py-1.5 text-xs font-medium bg-(--color-bg-surface)
               hover:bg-(--color-error-bg) text-(--color-error)! border border-(--color-error-border) shrink-0"
            >
              {isReportedUserBanned ? 'Unban User' : 'Ban User'}
            </Button>
          </div>
        {/if}
      </div>

      <!-- Zone 3: Admin-Only Actions -->
      {#if loggedInUser.role === 'ADMIN'}
        <div class="pt-2">
          <div
            class="p-3 border bg-(--color-error-bg) rounded-lg flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2">
              <i class="fa fa-warning text-xs text-(--color-error)"></i>
              <div>
                <p class="text-xs font-bold">Permanently Delete Report</p>
                <p class="text-[11px] text-(--color-text-tertiary)">
                  Removes this report record completely from database logs.
                </p>
              </div>
            </div>
            <button
              type="button"
              onclick={() => (currentAction = { type: 'DELETE_REPORT' })}
              class="px-2.5 py-1.5 rounded-md text-xs font-medium bg-(--color-error-muted)
                 border border-(--color-error-border) text-white transition-colors shrink-0 shadow-xs"
            >
              Delete Report
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if currentAction}
  {#if currentAction.type === 'CHANGE_STATUS'}
    {@const status = currentAction.targetStatus}
    <Modal modalTitle="Update status" onClose={closeModal}>
      <div class="space-y-4">
        <div class="bg-(--color-bg-surface) flex items-center justify-between">
          <h3 class="font-bold text-base flex items-center gap-2">
            <span>Change Status to:</span>
            <ReportStatusPill {status} />
          </h3>
        </div>
        <div class="space-y-1.5">
          <label
            for="history-note"
            class="text-xs font-semibold text-(--color-text-tertiary) uppercase"
          >
            Moderator History Note (Optional)
          </label>
          <textarea
            id="history-note"
            bind:value={customNoteInput}
            rows="3"
            placeholder={`Default: "${DEFAULT_REPORT_STATUS_NOTES[status](report.id, loggedInUser)}"`}
            class="w-full p-2.5 text-sm rounded-lg border border-(--color-border-subtle) bg-(--color-bg-surface) text-(--color-text-primary) placeholder:text-(--color-text-tertiary) focus:outline-hidden focus:border-(--color-link)"
            maxlength={REPORT_CONSTRAINTS.MAX_REASON_LENGTH}
          ></textarea>
          <p class="text-[11px] text-(--color-text-tertiary)">
            Leaving this empty will automatically record the default note in
            history.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <Button class="text-sm font-medium" type="button" onclick={closeModal}
            >Cancel</Button
          >
          <Button
            class="text-sm font-medium"
            type="button"
            disabled={isChangingStatus}
            onclick={() => handleConfirmStatusChange(status)}
          >
            {isChangingStatus ? 'Updating...' : 'Confirm Change'}
          </Button>
        </div>
      </div>
    </Modal>

    <!-- CONFIRMATION DIALOG: DELETE COMMENT -->
  {:else if currentAction.type === 'DELETE_COMMENT'}
    <Modal
      open
      modalTitle={'Confirm Delete'}
      closedby="none"
      onClose={closeModal}
    >
      <div class="flex flex-col gap-6 max-w-sm">
        <div class="flex flex-col gap-2 text-sm text-(--color-text-secondary)">
          <p class="leading-relaxed">
            You are about to permanently delete this comment:
          </p>

          <div
            class="bg-(--color-bg-surface-hover) border-l-4 border-(--color-error)
           rounded-r-md px-3 py-2.5 my-1"
          >
            <i
              class="not-italic font-medium text-(--color-text-primary) block
             truncate line-clamp-1"
              title={report?.reportedComment.content}
            >
              {report.reportedComment.content}
            </i>
          </div>

          <p class="text-sm text-(--color-text-secondary)">
            Are you sure you want to delete this comment and all its replies?
          </p>
          <div
            class="p-3 bg-(--color-warning-bg) text-(--color-warning) rounded-lg text-xs font-medium"
          >
            <i class="fa fa-exclamation-triangle mr-1"></i>
            This action will also delete all reports referencing this comment.
          </div>
        </div>

        <div
          class="flex justify-end items-center gap-3 border-t
         border-(--color-border-subtle) pt-4"
        >
          <Button
            type="button"
            onclick={closeModal}
            class="px-4 py-2 text-sm font-medium rounded-md 
            hover:bg-(--color-accent-hover)
            transition-colors"
          >
            Cancel
          </Button>

          <Button
            disabled={isDeletingComment}
            onclick={() => {
              handleConfirmDeleteComment();
            }}
            class="bg-(--color-error) disabled:bg-(--color-error-muted) hover:bg-(--color-error-muted)
           font-medium px-4 py-2 rounded-md shadow-xs transition-colors text-sm text-white!"
          >
            {#if isDeletingComment}
              <SpinnerLoader loadingMessage="Deleting..."
              ></SpinnerLoader>{:else}
              Delete comment
            {/if}
          </Button>
        </div>
      </div>
    </Modal>
  {:else if currentAction.type === 'TOGGLE_BAN'}
    <Modal
      modalTitle={isReportedUserBanned ? 'Unban User' : 'Ban User'}
      onClose={closeModal}
    >
      <div class="space-y-4">
        <p class="text-sm text-(--color-text-secondary) max-w-80">
          {#if isReportedUserBanned}
            Are you sure you want to unban <strong
              >{report.reportedComment.user.username}</strong
            >? Their access to create posts and comments will be restored.
          {:else}
            Are you sure you want to ban <strong
              >{report.reportedComment.user.username}</strong
            >? They will no longer be able to interact with the platform.
          {/if}
        </p>

        <div class="flex items-center justify-end gap-2 pt-2">
          <Button class="font-medium text-sm" type="button" onclick={closeModal}
            >Cancel</Button
          >
          <Button
            type="button"
            disabled={isBanning}
            onclick={handleConfirmToggleBan}
            class="bg-(--color-error) disabled:bg-(--color-error-muted)
             hover:bg-(--color-error-muted) text-white font-medium text-sm"
          >
            {#if isBanning}
              <SpinnerLoader></SpinnerLoader>
            {:else}
              {isReportedUserBanned ? 'Confirm Unban' : 'Confirm Ban'}
            {/if}
          </Button>
        </div>
      </div>
    </Modal>

    <!-- CONFIRMATION DIALOG: DELETE REPORT -->
  {:else if currentAction.type === 'DELETE_REPORT'}
    <Modal
      open
      modalTitle={'Confirm Delete'}
      closedby="none"
      onClose={closeModal}
    >
      <div class="flex flex-col gap-6 max-w-sm">
        <div class="flex flex-col gap-2 text-sm text-(--color-text-secondary)">
          <p class="leading-relaxed">
            You are about to permanently delete this report:
          </p>

          <div
            class="bg-(--color-bg-surface-hover) border-l-4 border-(--color-error)
           rounded-r-md px-3 py-2.5 my-1"
          >
            <i
              class="not-italic font-medium text-(--color-text-primary) block
             truncate line-clamp-1"
              title={report?.reason}
            >
              {report?.reason}
            </i>
          </div>

          <p class="text-xs text-(--color-text-tertiary)">
            This action cannot be undone.
          </p>
        </div>

        <div
          class="flex justify-end items-center gap-3 border-t
         border-(--color-border-subtle) pt-4"
        >
          <Button
            type="button"
            onclick={closeModal}
            class="px-4 py-2 text-sm font-medium rounded-md 
            hover:bg-(--color-accent-hover)
            transition-colors"
          >
            Cancel
          </Button>

          <Button
            disabled={isDeletingReport}
            onclick={() => {
              handleConfirmDeleteReport();
            }}
            class="bg-(--color-error) disabled:bg-(--color-error-muted) hover:bg-(--color-error-muted) text-white
           font-medium px-4 py-2 rounded-md shadow-xs transition-colors text-sm"
          >
            {#if isDeletingReport}
              <SpinnerLoader loadingMessage="Deleting..."
              ></SpinnerLoader>{:else}
              Delete report
            {/if}
          </Button>
        </div>
      </div>
    </Modal>
  {/if}
{/if}
