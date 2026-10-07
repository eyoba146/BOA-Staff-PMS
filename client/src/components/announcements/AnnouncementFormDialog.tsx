import { useState, useEffect, type FormEvent } from 'react';
import type { Announcement, AnnouncementCategory, AnnouncementInput } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea, Checkbox } from '@/components/ui';
import { required, validateForm, hasErrors } from '@/utils/validation';
import { ANNOUNCEMENT_CATEGORY_META } from '@/utils/status';

interface AnnouncementFormDialogProps {
  open: boolean;
  onClose: () => void;
  announcement?: Announcement | null;
  onSubmit: (data: AnnouncementInput) => Promise<void>;
}

const CATEGORIES: AnnouncementCategory[] = ['notice', 'meeting', 'holiday', 'general'];

export function AnnouncementFormDialog({
  open,
  onClose,
  announcement,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const isEdit = Boolean(announcement);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('notice');
  const [pinned, setPinned] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(true);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setBody(announcement.body);
      setCategory(announcement.category);
      setPinned(announcement.pinned);
      setPublishImmediately(announcement.status === 'published');
    } else {
      setTitle('');
      setBody('');
      setCategory('notice');
      setPinned(false);
      setPublishImmediately(true);
    }
    setErrors({});
  }, [announcement, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(
      { title, body },
      {
        title: [required('Announcement title')],
        body: [required('Announcement content')],
      },
    );

    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        category,
        pinned,
        publish: publishImmediately,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Announcement' : 'New Branch Announcement'}
      description="Post meetings, holiday schedules, branch notices, or team announcements."
      size="md"
      busy={submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit
              ? 'Update Announcement'
              : publishImmediately
              ? 'Publish Announcement'
              : 'Save as Draft'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <Field label="Title" error={errors.title} required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly Branch Review Meeting, Eid/Meskel Schedule Notice"
          />
        </Field>

        <Field label="Category" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ANNOUNCEMENT_CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Announcement Message" error={errors.body} required>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Type announcement details..."
          />
        </Field>

        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <Checkbox
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            label="Pin to top"
            description="Pinned announcements stay at the top of staff dashboards and lists."
          />

          {!isEdit && (
            <Checkbox
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              label="Publish immediately"
              description="Uncheck to save as a draft visible only to branch management."
            />
          )}
        </div>
      </form>
    </Dialog>
  );
}
