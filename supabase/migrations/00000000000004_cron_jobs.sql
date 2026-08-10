DO $$
BEGIN
  PERFORM cron.unschedule('process-task-recurrences')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-task-recurrences');

  PERFORM cron.schedule(
    'process-task-recurrences',
    '5 * * * *',
    'SELECT fluxion.process_task_recurrences()'
  );
END;
$$;
