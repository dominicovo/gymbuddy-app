-- Removes every dummy account made by dummy_buddies.sql, and with them (by
-- cascade) their profiles, buddy links, check-ins, schedules and nudges.
-- Only touches the reserved @seed.gymbuddy.invalid addresses.
delete from auth.users where email like '%@seed.gymbuddy.invalid';
