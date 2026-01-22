-- Add policy to allow anyone to view pending invitations by token
-- This is needed for the invitation acceptance flow where new users need to view invitation details before creating an account
CREATE POLICY "Anyone can view pending invitations by token"
ON public.team_invitations
FOR SELECT
TO anon, authenticated
USING (
  status = 'pending' 
  AND expires_at > now()
);