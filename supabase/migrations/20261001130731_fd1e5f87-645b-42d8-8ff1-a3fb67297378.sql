DELETE FROM public.editor_messages
WHERE (project_id = (SELECT id FROM public.projects WHERE slug = 'the-medium-popcorn-at-the-movies-is-a-trap')
       AND (msg_id IN ('epRPGwzbBgr8PTL2','y0r6VA8AX5Imtbr2','qCmHeM3qgDUIbI09') OR msg_id = ''))
   OR (project_id = '060ab3f9-2c43-4654-8687-060adc6411c9' AND msg_id LIKE 'probe-long-%');