# Managing users

Platform admins can manage every user from **Settings → Users**. Organization
admins see only the members of their organizations.

## Capabilities

- **Search & filter** — by username, email or organization role.
- **Change role** — promote or demote a user within an organization. The last
  `OWNER` of an organization cannot be demoted.
- **Suspend / reactivate** *(platform admin)* — suspended users cannot log in
  and existing refresh tokens are invalidated. You cannot suspend yourself.
- **Reset password** *(platform admin)* — generates a 12-character temporary
  password and emails it to the user. If SMTP is not configured the temp
  password is shown to the admin once.
- **Remove user** — removing without an organization context deletes the
  user globally; otherwise only the organization membership is removed. You
  cannot remove yourself or the last `OWNER` of any organization.
- **Audit trail** — every user action is recorded and viewable from the user
  detail view.
