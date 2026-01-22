-- Create user roles enum and team invitations system
-- This enables admin to invite vendors and other admins with different permission levels

-- Create invitations table for team management
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('owner', 'admin', 'vendedor')),
  invited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.workspace_id = workspaces.id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- RLS Policies for team_members
CREATE POLICY "Team members can view their workspace members"
ON public.team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.workspace_id = team_members.workspace_id
    AND tm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = team_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can add team members"
ON public.team_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.workspace_id = team_members.workspace_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'owner')
  ) OR
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = team_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can update team members"
ON public.team_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.workspace_id = team_members.workspace_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'owner')
  ) OR
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = team_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can delete team members"
ON public.team_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.workspace_id = team_members.workspace_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'owner')
  ) OR
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = team_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

-- RLS Policies for team_invitations
CREATE POLICY "Admins can view invitations for their workspace"
ON public.team_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.workspace_id = team_invitations.workspace_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('admin', 'owner')
  ) OR
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = team_invitations.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (
  invited_by = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.workspace_id = team_invitations.workspace_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = team_invitations.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can update invitations"
ON public.team_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.workspace_id = team_invitations.workspace_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('admin', 'owner')
  ) OR
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = team_invitations.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_workspace_id ON public.team_members(workspace_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);