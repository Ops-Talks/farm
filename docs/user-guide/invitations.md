# Inviting people to your organization

Organization owners and admins can invite users from the **People** page.

1. Open your organization's **People** view.
2. Click **Invite**, paste one or more email addresses, choose a role
   (`MEMBER`, `ADMIN`, `OWNER`) and an optional message.
3. The invitee receives an email with a link of the form
   `https://your-host/invitations/<token>`.

Invitations expire after **7 days**. Pending invitations can be re-sent or
revoked from the same page. A scheduled job sweeps expired tokens every six
hours.

## Accepting an invitation

The invitation link opens a public preview showing the organization name, the
role you would receive, who invited you and when the link expires. To accept
you must first have a Farm user account (sign up using the same email
address). Once logged in, click **Accept invitation** and you will be added
to the organization with the assigned role.
