create or replace function public.public_submit_contact_message(
    p_name text,
    p_email text,
    p_subject text default null,
    p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_email text := btrim(coalesce(p_email, ''));
    v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
    v_message text := btrim(coalesce(p_message, ''));
    v_contact_message_id text;
begin
    if length(v_name) < 1 or length(v_name) > 200 then
        raise exception 'invalid contact name';
    end if;

    if length(v_email) < 3
        or length(v_email) > 320
        or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    then
        raise exception 'invalid contact email';
    end if;

    if v_subject is not null and length(v_subject) > 300 then
        raise exception 'invalid contact subject';
    end if;

    if length(v_message) < 1 or length(v_message) > 5000 then
        raise exception 'invalid contact message';
    end if;

    insert into public.contact_messages (name, email, subject, message)
    values (v_name, v_email, v_subject, v_message)
    returning id::text into v_contact_message_id;

    perform public.log_platform_event(
        'support',
        'public_contact_message_submitted',
        'info',
        auth.uid(),
        null,
        null,
        null,
        null,
        v_contact_message_id,
        'Public contact message submitted.',
        jsonb_build_object(
            'email_domain',
            split_part(v_email, '@', 2),
            'has_subject',
            v_subject is not null
        )
    );

    return jsonb_build_object('ok', true, 'id', v_contact_message_id);
end;
$$;

revoke all on function public.public_submit_contact_message(text, text, text, text) from public;
grant execute on function public.public_submit_contact_message(text, text, text, text) to anon, authenticated;

drop policy if exists contact_messages_insert_public on public.contact_messages;
