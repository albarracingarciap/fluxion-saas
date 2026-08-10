-- =========================================================================
-- FLUXION SAAS — PERMISOS DE ESCRITURA PARA EL FRONTEND (Server Actions)
-- =========================================================================
-- Ejecuta este código en la sección "SQL Editor" de Supabase para permitir
-- que el frontend pueda guardar cambios, invitar usuarios y modificar roles.

-- 1. Políticas para `fluxion.organizations`
-- Permitir que un Administrador actualice los datos de su empresa
CREATE POLICY "Un admin puede actualizar su organizacion" 
  ON fluxion.organizations 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members 
      WHERE organization_members.organization_id = fluxion.organizations.id 
      AND organization_members.user_id = auth.uid() 
      AND organization_members.role = 'admin'
    )
  );

-- 2. Políticas para `fluxion.invitations`
-- Permitir que un Administrador invite usuarios (INSERT)
CREATE POLICY "Un admin puede insertar invitaciones" 
  ON fluxion.invitations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members 
      WHERE organization_members.organization_id = fluxion.invitations.organization_id 
      AND organization_members.user_id = auth.uid() 
      AND organization_members.role = 'admin'
    )
  );

-- Permitir que un Administrador cancele/elimine invitaciones (DELETE)
CREATE POLICY "Un admin puede eliminar invitaciones" 
  ON fluxion.invitations 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members 
      WHERE organization_members.organization_id = fluxion.invitations.organization_id 
      AND organization_members.user_id = auth.uid() 
      AND organization_members.role = 'admin'
    )
  );

-- 3. Políticas para `fluxion.organization_members`
-- Permitir que un Administrador cambie roles de su equipo (UPDATE)
CREATE POLICY "Un admin puede actualizar roles" 
  ON fluxion.organization_members 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members admin_check
      WHERE admin_check.organization_id = fluxion.organization_members.organization_id 
      AND admin_check.user_id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- Permitir que un Administrador elimine miembros de su equipo (DELETE)
CREATE POLICY "Un admin puede eliminar miembros" 
  ON fluxion.organization_members 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members admin_check
      WHERE admin_check.organization_id = fluxion.organization_members.organization_id 
      AND admin_check.user_id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );
