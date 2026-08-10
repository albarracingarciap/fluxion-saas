DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'fluxion'::regnamespace
      AND typname = 'fmea_second_review_status'
  ) THEN
    CREATE TYPE fluxion.fmea_second_review_status AS ENUM (
      'not_required',
      'pending',
      'approved',
      'rejected'
    );
  END IF;
END $$;

ALTER TABLE fluxion.fmea_items
  ADD COLUMN IF NOT EXISTS second_review_status fluxion.fmea_second_review_status NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS second_reviewed_by uuid REFERENCES fluxion.profiles(id),
  ADD COLUMN IF NOT EXISTS second_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS second_review_notes text;

UPDATE fluxion.fmea_items
SET second_review_status = CASE
  WHEN requires_second_review = true AND status = 'evaluated' THEN 'pending'::fluxion.fmea_second_review_status
  ELSE 'not_required'::fluxion.fmea_second_review_status
END
WHERE second_review_status IS DISTINCT FROM CASE
  WHEN requires_second_review = true AND status = 'evaluated' THEN 'pending'::fluxion.fmea_second_review_status
  ELSE 'not_required'::fluxion.fmea_second_review_status
END;

UPDATE fluxion.fmea_items
SET
  second_reviewed_by = NULL,
  second_reviewed_at = NULL,
  second_review_notes = NULL
WHERE second_review_status = 'not_required';

CREATE INDEX IF NOT EXISTS idx_fmea_items_second_review
  ON fluxion.fmea_items(evaluation_id, second_review_status)
  WHERE requires_second_review = true;
