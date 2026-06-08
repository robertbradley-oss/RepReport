import { useEffect, useMemo, useState } from "react";
import {
  buildReviewPromiseSearchText,
  createEmptyReviewPromiseDraft,
  createReviewPromiseFromDraft,
  getReviewPromiseDraft,
  loadReviewPromises,
  saveReviewPromises,
  updateReviewPromiseFromDraft,
  type ReviewPromiseDraft,
} from "../lib/review-promises";
import {
  REVIEW_PROMISE_PLATFORMS,
  REVIEW_PROMISE_STATUSES,
  type ReviewPromiseEntry,
  type ReviewPromisePlatform,
  type ReviewPromiseStatus,
} from "../types";
import { UiIcon } from "./UiIcon";

type FormMode = "add" | "edit";

export function ReviewPromisesPanel() {
  const [promises, setPromises] = useState<ReviewPromiseEntry[]>(loadReviewPromises);
  const [searchTerm, setSearchTerm] = useState("");
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReviewPromiseDraft>(createEmptyReviewPromiseDraft);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    saveReviewPromises(promises);
  }, [promises]);

  const filteredPromises = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return promises;
    }

    return promises.filter((promise) => buildReviewPromiseSearchText(promise).includes(query));
  }, [promises, searchTerm]);

  function openAddForm() {
    setDraft(createEmptyReviewPromiseDraft());
    setEditingId(null);
    setFormMode("add");
    setStatusMessage("");
  }

  function openEditForm(promise: ReviewPromiseEntry) {
    setDraft(getReviewPromiseDraft(promise));
    setEditingId(promise.id);
    setFormMode("edit");
    setStatusMessage("");
  }

  function closeForm() {
    setDraft(createEmptyReviewPromiseDraft());
    setEditingId(null);
    setFormMode(null);
  }

  function savePromise() {
    if (!draft.customerName.trim()) {
      setStatusMessage("Customer name is required.");
      return;
    }

    if (formMode === "edit" && editingId) {
      setPromises((current) =>
        current.map((promise) => (promise.id === editingId ? updateReviewPromiseFromDraft(promise, draft) : promise)),
      );
      setStatusMessage("Promise updated.");
    } else {
      setPromises((current) => [createReviewPromiseFromDraft(draft), ...current]);
      setStatusMessage("Promise added.");
    }

    closeForm();
  }

  function deletePromise(id: string) {
    setPromises((current) => current.filter((promise) => promise.id !== id));
    if (editingId === id) {
      closeForm();
    }
    setStatusMessage("Promise deleted.");
  }

  return (
    <section className="promiseDashboard" aria-label="Review Promises">
      <div className="resultsPanel promisePanel">
        <div className="panelHeader promiseHeader">
          <div>
            <h2 className="panelTitle">Promised Reviews</h2>
            <p className="helperText">Track customers who said they will leave a review.</p>
          </div>
          <button className="primaryButton neuButton" type="button" onClick={openAddForm}>
            <UiIcon name="add" />
            Add Promise
          </button>
        </div>

        <div className="promiseToolbar">
          <label className="promiseSearchField">
            <span className="srOnly">Search promises</span>
            <UiIcon name="search" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search promises"
              spellCheck={false}
            />
          </label>
          <span className="promiseCount" aria-live="polite">
            {filteredPromises.length} of {promises.length}
          </span>
        </div>

        {formMode && (
          <PromiseForm
            draft={draft}
            mode={formMode}
            onChange={setDraft}
            onCancel={closeForm}
            onSave={savePromise}
          />
        )}

        {filteredPromises.length > 0 ? (
          <div className="promiseCardGrid">
            {filteredPromises.map((promise) => (
              <PromiseCard key={promise.id} promise={promise} onEdit={openEditForm} onDelete={deletePromise} />
            ))}
          </div>
        ) : (
          <div className="emptyState promiseEmptyState">
            <span className="emptyStateIcon">
              <UiIcon name="reviewLog" size={24} />
            </span>
            <strong>{promises.length === 0 ? "No promises yet" : "No matching promises"}</strong>
            <span>{promises.length === 0 ? "Add a customer promise so ticket details are ready later." : "Adjust the search to see more promises."}</span>
          </div>
        )}

        <div className="statusLine" aria-live="polite">
          {statusMessage}
        </div>
      </div>
    </section>
  );
}

function PromiseForm({
  draft,
  mode,
  onChange,
  onCancel,
  onSave,
}: {
  draft: ReviewPromiseDraft;
  mode: FormMode;
  onChange: (draft: ReviewPromiseDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  function updateField<Key extends keyof ReviewPromiseDraft>(key: Key, value: ReviewPromiseDraft[Key]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="promiseForm" aria-label={mode === "add" ? "Add promise" : "Edit promise"}>
      <div className="promiseFormHeader">
        <h3>{mode === "add" ? "Add Promise" : "Edit Promise"}</h3>
        <div className="buttonRow">
          <button className="secondaryButton" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primaryButton" type="button" onClick={onSave}>
            Save Promise
          </button>
        </div>
      </div>

      <div className="promiseFormGrid">
        <label className="promiseField promiseFieldWide">
          <span>Customer name</span>
          <input
            aria-label="Customer name"
            type="text"
            value={draft.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            placeholder="Customer name"
            spellCheck={false}
          />
        </label>
        <label className="promiseField">
          <span>Platform</span>
          <select
            aria-label="Platform"
            value={draft.platform}
            onChange={(event) => updateField("platform", event.target.value as ReviewPromisePlatform)}
          >
            {REVIEW_PROMISE_PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </label>
        <label className="promiseField">
          <span>Status</span>
          <select
            aria-label="Status"
            value={draft.status}
            onChange={(event) => updateField("status", event.target.value as ReviewPromiseStatus)}
          >
            {REVIEW_PROMISE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="promiseField">
          <span>Ticket number</span>
          <input
            aria-label="Ticket number"
            type="text"
            value={draft.ticketNumber}
            onChange={(event) => updateField("ticketNumber", event.target.value)}
            placeholder="Optional"
            spellCheck={false}
          />
        </label>
        <label className="promiseField">
          <span>Model number</span>
          <input
            aria-label="Model number"
            type="text"
            value={draft.modelNumber}
            onChange={(event) => updateField("modelNumber", event.target.value)}
            placeholder="Optional"
            spellCheck={false}
          />
        </label>
        <label className="promiseField">
          <span>Follow-up date</span>
          <input
            aria-label="Follow-up date"
            type="date"
            value={draft.followUpDate}
            onChange={(event) => updateField("followUpDate", event.target.value)}
          />
        </label>
        <label className="promiseField promiseFieldWide">
          <span>Ticket link</span>
          <input
            aria-label="Ticket link"
            type="url"
            value={draft.ticketLink}
            onChange={(event) => updateField("ticketLink", event.target.value)}
            placeholder="Optional"
            spellCheck={false}
          />
        </label>
        <label className="promiseField promiseNoteField">
          <span>Promise note</span>
          <textarea
            aria-label="Promise note"
            value={draft.promiseNote}
            onChange={(event) => updateField("promiseNote", event.target.value)}
            placeholder="Optional"
            rows={4}
            spellCheck={false}
          />
        </label>
      </div>
    </div>
  );
}

function PromiseCard({
  promise,
  onEdit,
  onDelete,
}: {
  promise: ReviewPromiseEntry;
  onEdit: (promise: ReviewPromiseEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="promiseCard">
      <div className="promiseCardHeader">
        <div className="promiseCardTitle">
          <strong>{promise.customerName || "Unnamed customer"}</strong>
          <div className="promiseBadges">
            <span className="promiseBadge platformBadge">{promise.platform}</span>
            <span className={`promiseBadge statusBadge statusBadge-${promise.status.toLowerCase().replace(/\s+/g, "-")}`}>{promise.status}</span>
          </div>
        </div>
        <div className="promiseCardActions">
          <button className="secondaryButton iconButton" type="button" aria-label={`Edit ${promise.customerName || "promise"}`} onClick={() => onEdit(promise)}>
            <UiIcon name="edit" />
          </button>
          <button className="dangerButton iconButton" type="button" aria-label={`Delete ${promise.customerName || "promise"}`} onClick={() => onDelete(promise.id)}>
            <UiIcon name="clear" />
          </button>
        </div>
      </div>

      <dl className="promiseMeta">
        {promise.ticketNumber && (
          <div>
            <dt>Ticket</dt>
            <dd>{promise.ticketNumber}</dd>
          </div>
        )}
        {promise.modelNumber && (
          <div>
            <dt>Model</dt>
            <dd>{promise.modelNumber}</dd>
          </div>
        )}
        {promise.followUpDate && (
          <div>
            <dt>Follow up</dt>
            <dd>{formatDateForDisplay(promise.followUpDate)}</dd>
          </div>
        )}
      </dl>

      {promise.ticketLink && (
        <a className="urlChip promiseTicketLink" href={promise.ticketLink} target="_blank" rel="noreferrer">
          Ticket link
        </a>
      )}
      {promise.promiseNote && <p className="promiseNotePreview">{promise.promiseNote}</p>}
    </article>
  );
}

function formatDateForDisplay(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${month}/${day}/${year}`;
}
