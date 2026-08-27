update public.products
   set production_status = 'published',
       moderation_status = 'approved',
       moderation_reviewed_at = coalesce(moderation_reviewed_at, now()),
       readiness_notes = coalesce(
           readiness_notes,
           'Legacy published product backfilled as catalog-ready after production moderation gates were introduced.'
       )
 where is_published = true
   and production_status = 'manual'
   and moderation_status = 'pending_review';
