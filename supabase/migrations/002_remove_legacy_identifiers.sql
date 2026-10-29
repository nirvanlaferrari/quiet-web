-- Required privacy migration: remove only old contributor-linked discovery evidence.
-- View counts and the new anonymous batch aggregates are preserved.
delete from public.quiet_state where key in ('discovery','read-next');
