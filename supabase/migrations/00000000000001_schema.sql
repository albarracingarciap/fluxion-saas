--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: compliance; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA compliance;


ALTER SCHEMA compliance OWNER TO postgres;

--
-- Name: fluxion; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA fluxion;


ALTER SCHEMA fluxion OWNER TO postgres;

--
-- Name: rag; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rag;


ALTER SCHEMA rag OWNER TO postgres;

--
-- Name: confidence_level; Type: TYPE; Schema: compliance; Owner: postgres
--

CREATE TYPE compliance.confidence_level AS ENUM (
    'high',
    'medium',
    'low'
);


ALTER TYPE compliance.confidence_level OWNER TO postgres;

--
-- Name: relationship_type; Type: TYPE; Schema: compliance; Owner: postgres
--

CREATE TYPE compliance.relationship_type AS ENUM (
    'causes',
    'amplifies',
    'enables',
    'correlates'
);


ALTER TYPE compliance.relationship_type OWNER TO postgres;

--
-- Name: ai_output_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.ai_output_type AS ENUM (
    'decision',
    'recomendacion',
    'clasificacion',
    'generacion',
    'prediccion',
    'deteccion',
    'optimizacion',
    'otro'
);


ALTER TYPE fluxion.ai_output_type OWNER TO postgres;

--
-- Name: ai_provider_origin; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.ai_provider_origin AS ENUM (
    'interno',
    'proveedor',
    'saas',
    'oss'
);


ALTER TYPE fluxion.ai_provider_origin OWNER TO postgres;

--
-- Name: ai_system_domain; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.ai_system_domain AS ENUM (
    'finanzas',
    'seguros',
    'credito',
    'salud',
    'rrhh',
    'educacion',
    'seguridad',
    'justicia',
    'migracion',
    'infra',
    'marketing',
    'operaciones',
    'atencion',
    'cumplimiento',
    'otro'
);


ALTER TYPE fluxion.ai_system_domain OWNER TO postgres;

--
-- Name: ai_system_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.ai_system_status AS ENUM (
    'produccion',
    'desarrollo',
    'piloto',
    'deprecado',
    'retirado'
);


ALTER TYPE fluxion.ai_system_status OWNER TO postgres;

--
-- Name: ai_system_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.ai_system_type AS ENUM (
    'ml',
    'dl',
    'llm',
    'agentico',
    'reglas',
    'hibrido',
    'otro'
);


ALTER TYPE fluxion.ai_system_type OWNER TO postgres;

--
-- Name: aiact_risk_level; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.aiact_risk_level AS ENUM (
    'prohibited',
    'gpai',
    'high',
    'limited',
    'minimal',
    'pending'
);


ALTER TYPE fluxion.aiact_risk_level OWNER TO postgres;

--
-- Name: approval_level; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.approval_level AS ENUM (
    'level_1',
    'level_2',
    'level_3'
);


ALTER TYPE fluxion.approval_level OWNER TO postgres;

--
-- Name: cert_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.cert_status AS ENUM (
    'declaracion_emitida',
    'en_evaluacion',
    'certificacion_ce',
    'pendiente',
    'no_aplica'
);


ALTER TYPE fluxion.cert_status OWNER TO postgres;

--
-- Name: classification_event_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.classification_event_status AS ENUM (
    'pending_reconciliation',
    'reconciled',
    'superseded'
);


ALTER TYPE fluxion.classification_event_status OWNER TO postgres;

--
-- Name: classification_method; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.classification_method AS ENUM (
    'initial',
    'rules_engine',
    'ai_agent',
    'manual_review'
);


ALTER TYPE fluxion.classification_method OWNER TO postgres;

--
-- Name: committee_member_role; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.committee_member_role AS ENUM (
    'president',
    'secretary',
    'member',
    'advisor'
);


ALTER TYPE fluxion.committee_member_role OWNER TO postgres;

--
-- Name: committee_session_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.committee_session_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE fluxion.committee_session_status OWNER TO postgres;

--
-- Name: committee_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.committee_type AS ENUM (
    'ai_committee',
    'risk_committee',
    'director_review'
);


ALTER TYPE fluxion.committee_type OWNER TO postgres;

--
-- Name: control_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.control_status AS ENUM (
    'planned',
    'partial',
    'implemented',
    'excluded'
);


ALTER TYPE fluxion.control_status OWNER TO postgres;

--
-- Name: data_retention; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.data_retention AS ENUM (
    'menos_6m',
    '6_12m',
    '1_3a',
    '3_5a',
    'mas_5a',
    'sin_politica'
);


ALTER TYPE fluxion.data_retention OWNER TO postgres;

--
-- Name: data_volume; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.data_volume AS ENUM (
    'menos_1gb',
    '1_100gb',
    '100gb_1tb',
    '1_10tb',
    'mas_10tb',
    'desconocido'
);


ALTER TYPE fluxion.data_volume OWNER TO postgres;

--
-- Name: diff_resolution; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.diff_resolution AS ENUM (
    'accepted',
    'excluded',
    'preserved',
    'archived'
);


ALTER TYPE fluxion.diff_resolution OWNER TO postgres;

--
-- Name: diff_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.diff_type AS ENUM (
    'added',
    'removed',
    'unchanged'
);


ALTER TYPE fluxion.diff_type OWNER TO postgres;

--
-- Name: doc_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.doc_status AS ENUM (
    'si',
    'parcial',
    'no',
    'proceso'
);


ALTER TYPE fluxion.doc_status OWNER TO postgres;

--
-- Name: evaluation_state; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.evaluation_state AS ENUM (
    'draft',
    'in_review',
    'approved',
    'superseded'
);


ALTER TYPE fluxion.evaluation_state OWNER TO postgres;

--
-- Name: evidence_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.evidence_type AS ENUM (
    'document',
    'policy',
    'test_report',
    'audit_log',
    'certificate',
    'screenshot',
    'meeting_minutes',
    'log_export',
    'other'
);


ALTER TYPE fluxion.evidence_type OWNER TO postgres;

--
-- Name: evidence_verification_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.evidence_verification_status AS ENUM (
    'pending',
    'validated',
    'rejected'
);


ALTER TYPE fluxion.evidence_verification_status OWNER TO postgres;

--
-- Name: fmea_second_review_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.fmea_second_review_status AS ENUM (
    'not_required',
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE fluxion.fmea_second_review_status OWNER TO postgres;

--
-- Name: gap_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.gap_status AS ENUM (
    'auto_detected',
    'confirmed',
    'in_progress',
    'resolved',
    'accepted_risk',
    'not_applicable'
);


ALTER TYPE fluxion.gap_status OWNER TO postgres;

--
-- Name: invitation_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.invitation_status AS ENUM (
    'pending',
    'accepted',
    'expired',
    'revoked'
);


ALTER TYPE fluxion.invitation_status OWNER TO postgres;

--
-- Name: mlops_integration; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.mlops_integration AS ENUM (
    'mlflow',
    'azureml',
    'sagemaker',
    'vertex',
    'databricks',
    'ninguno',
    'otro'
);


ALTER TYPE fluxion.mlops_integration OWNER TO postgres;

--
-- Name: org_role; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.org_role AS ENUM (
    'org_admin',
    'sgai_manager',
    'caio',
    'dpo',
    'system_owner',
    'risk_analyst',
    'compliance_analyst',
    'executive',
    'auditor',
    'viewer'
);


ALTER TYPE fluxion.org_role OWNER TO postgres;

--
-- Name: oversight_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.oversight_type AS ENUM (
    'previo',
    'posterior',
    'muestral',
    'umbral',
    'auditoria'
);


ALTER TYPE fluxion.oversight_type OWNER TO postgres;

--
-- Name: platform_role; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.platform_role AS ENUM (
    'platform_admin',
    'partner'
);


ALTER TYPE fluxion.platform_role OWNER TO postgres;

--
-- Name: priority_source; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.priority_source AS ENUM (
    'rules',
    'agent',
    'human'
);


ALTER TYPE fluxion.priority_source OWNER TO postgres;

--
-- Name: priority_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.priority_status AS ENUM (
    'pending_review',
    'prioritized',
    'monitoring',
    'dismissed'
);


ALTER TYPE fluxion.priority_status OWNER TO postgres;

--
-- Name: reevaluation_trigger_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.reevaluation_trigger_type AS ENUM (
    'regulatorio',
    'incidente',
    'cambio_sistema',
    'periodico'
);


ALTER TYPE fluxion.reevaluation_trigger_type OWNER TO postgres;

--
-- Name: residual_risk; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.residual_risk AS ENUM (
    'bajo',
    'medio',
    'alto',
    'muy_alto',
    'no_determinado'
);


ALTER TYPE fluxion.residual_risk OWNER TO postgres;

--
-- Name: review_frequency; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.review_frequency AS ENUM (
    'mensual',
    'trimestral',
    'semestral',
    'anual',
    'adhoc'
);


ALTER TYPE fluxion.review_frequency OWNER TO postgres;

--
-- Name: task_priority; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE fluxion.task_priority OWNER TO postgres;

--
-- Name: task_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.task_status AS ENUM (
    'todo',
    'in_progress',
    'blocked',
    'in_review',
    'done',
    'cancelled'
);


ALTER TYPE fluxion.task_status OWNER TO postgres;

--
-- Name: treatment_action_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.treatment_action_status AS ENUM (
    'pending',
    'in_progress',
    'evidence_pending',
    'completed',
    'accepted',
    'cancelled'
);


ALTER TYPE fluxion.treatment_action_status OWNER TO postgres;

--
-- Name: treatment_action_type; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.treatment_action_type AS ENUM (
    'mitigate',
    'accept',
    'transfer',
    'avoid',
    'defer'
);


ALTER TYPE fluxion.treatment_action_type OWNER TO postgres;

--
-- Name: treatment_option; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.treatment_option AS ENUM (
    'mitigar',
    'aceptar',
    'transferir',
    'evitar',
    'diferir'
);


ALTER TYPE fluxion.treatment_option OWNER TO postgres;

--
-- Name: treatment_plan_status; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.treatment_plan_status AS ENUM (
    'draft',
    'in_review',
    'approved',
    'in_progress',
    'closed',
    'superseded'
);


ALTER TYPE fluxion.treatment_plan_status OWNER TO postgres;

--
-- Name: usage_scale; Type: TYPE; Schema: fluxion; Owner: postgres
--

CREATE TYPE fluxion.usage_scale AS ENUM (
    'menos_100m',
    '100_1k_m',
    '1k_10k_m',
    '10k_100k_m',
    'mas_100k_m'
);


ALTER TYPE fluxion.usage_scale OWNER TO postgres;

--
-- Name: chunk_type; Type: TYPE; Schema: rag; Owner: postgres
--

CREATE TYPE rag.chunk_type AS ENUM (
    'article',
    'paragraph',
    'recital',
    'annex_item',
    'definition',
    'full_doc'
);


ALTER TYPE rag.chunk_type OWNER TO postgres;

--
-- Name: source_type; Type: TYPE; Schema: rag; Owner: postgres
--

CREATE TYPE rag.source_type AS ENUM (
    'eu_regulation',
    'eu_directive',
    'iso_standard',
    'authority_guide',
    'harmonized_std',
    'national_law',
    'case_reference',
    'tenant_doc'
);


ALTER TYPE rag.source_type OWNER TO postgres;

--
-- Name: action_status_to_task_status(fluxion.treatment_action_status); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.action_status_to_task_status(p_action_status fluxion.treatment_action_status) RETURNS fluxion.task_status
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE p_action_status
    WHEN 'pending'          THEN 'todo'::fluxion.task_status
    WHEN 'in_progress'      THEN 'in_progress'::fluxion.task_status
    WHEN 'evidence_pending' THEN 'in_review'::fluxion.task_status
    WHEN 'completed'        THEN 'done'::fluxion.task_status
    WHEN 'accepted'         THEN 'done'::fluxion.task_status
    WHEN 'cancelled'        THEN 'cancelled'::fluxion.task_status
    ELSE                         'todo'::fluxion.task_status
  END;
$$;


ALTER FUNCTION fluxion.action_status_to_task_status(p_action_status fluxion.treatment_action_status) OWNER TO postgres;

--
-- Name: auth_user_org_id(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.auth_user_org_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'fluxion', 'public'
    AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM fluxion.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_org_id;
END;
$$;


ALTER FUNCTION fluxion.auth_user_org_id() OWNER TO postgres;

--
-- Name: calculate_failure_mode_priority(smallint, text, numeric, text, boolean, boolean, boolean, boolean, text, boolean, boolean, text, text, boolean); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean) RETURNS TABLE(score smallint, level text, status fluxion.priority_status)
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_dimension text := lower(coalesce(p_dimension, ''));
  v_domain text := lower(coalesce(p_domain, ''));
  v_output_type text := lower(coalesce(p_output_type, ''));
  v_ai_system_type text := lower(coalesce(p_ai_system_type, ''));
  v_aiact_level text := lower(coalesce(p_aiact_risk_level, ''));
  v_severity_score int := 0;
  v_dimension_score int := 0;
  v_signal_sum int := 0;
  v_signal_score int := 0;
  v_base numeric := 0;
  v_final numeric := 0;
  v_level text;
  v_status fluxion.priority_status;
  v_hard_override boolean := false;
  v_has_strong_human_signal boolean := false;
  v_is_generative boolean := false;
  v_is_high_candidate boolean := false;
BEGIN
  v_severity_score := CASE p_s_default
    WHEN 9 THEN 40
    WHEN 8 THEN 32
    WHEN 7 THEN 24
    WHEN 6 THEN 16
    WHEN 5 THEN 10
    WHEN 4 THEN 6
    ELSE 2
  END;

  v_dimension_score := CASE v_dimension
    WHEN 'seguridad' THEN 15
    WHEN 'legal_b' THEN 14
    WHEN 'etica' THEN 13
    WHEN 'tecnica' THEN 12
    WHEN 'gobernanza' THEN 10
    WHEN 'roi' THEN 4
    ELSE 8
  END;

  v_signal_sum := v_signal_sum + CASE v_aiact_level
    WHEN 'prohibited' THEN 15
    WHEN 'high' THEN 12
    WHEN 'limited' THEN 6
    ELSE 0
  END;

  IF coalesce(p_affects_persons, false) THEN v_signal_sum := v_signal_sum + 5; END IF;
  IF coalesce(p_has_minors, false) THEN v_signal_sum := v_signal_sum + 6; END IF;
  IF coalesce(p_vulnerable_groups, false) THEN v_signal_sum := v_signal_sum + 5; END IF;
  IF coalesce(p_biometric, false) THEN v_signal_sum := v_signal_sum + 6; END IF;

  IF v_domain IN ('salud', 'medicina', 'salud y medicina', 'finanzas', 'banca', 'banca y finanzas', 'seguros', 'credito') THEN
    v_signal_sum := v_signal_sum + 6;
  ELSIF v_domain IN ('sector_publico', 'sector publico', 'sector público', 'gobierno', 'gobierno y sector publico', 'gobierno y sector público', 'seguridad', 'justicia', 'migracion') THEN
    v_signal_sum := v_signal_sum + 5;
  END IF;

  IF coalesce(p_critical_infra, false) THEN v_signal_sum := v_signal_sum + 6; END IF;

  v_is_generative := coalesce(p_is_gpai, false) OR v_output_type = 'generacion';
  IF v_is_generative THEN v_signal_sum := v_signal_sum + 4; END IF;

  IF v_ai_system_type = 'agentico' OR coalesce(p_has_external_tools, false) THEN
    v_signal_sum := v_signal_sum + 4;
  END IF;

  v_signal_score := least(25, v_signal_sum);
  v_base := v_severity_score + v_dimension_score + v_signal_score;
  v_final := least(100, round(v_base * (0.75 + coalesce(p_w, 1.0) / 4.0)));

  v_level := CASE
    WHEN v_final >= 75 THEN 'critical'
    WHEN v_final >= 50 THEN 'high'
    WHEN v_final >= 30 THEN 'medium'
    ELSE 'low'
  END;

  v_has_strong_human_signal := (
    coalesce(p_affects_persons, false)
    OR coalesce(p_has_minors, false)
    OR coalesce(p_vulnerable_groups, false)
    OR coalesce(p_biometric, false)
  );

  v_hard_override := (
    p_s_default >= 8
    OR (coalesce(p_biometric, false) AND coalesce(p_affects_persons, false))
    OR (coalesce(p_has_minors, false) AND v_dimension IN ('etica', 'legal_b', 'seguridad'))
  );

  v_is_high_candidate := (
    p_s_default >= 7
    AND v_level = 'high'
    AND (
      v_dimension IN ('seguridad', 'tecnica')
      OR (v_dimension IN ('legal_b', 'etica') AND v_has_strong_human_signal)
    )
    AND v_dimension NOT IN ('gobernanza', 'roi')
  );

  IF v_hard_override OR v_level = 'critical' OR v_is_high_candidate THEN
    v_status := 'prioritized';
  ELSE
    v_status := 'monitoring';
  END IF;

  RETURN QUERY
  SELECT v_final::smallint, v_level, v_status;
END;
$$;


ALTER FUNCTION fluxion.calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean) OWNER TO postgres;

--
-- Name: FUNCTION calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean); Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON FUNCTION fluxion.calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean) IS 'Calcula priority_score, priority_level y priority_status para un modo de fallo activado en el contexto de un sistema. No modifica S_default.';


--
-- Name: check_priority_status_change_authorization(fluxion.priority_status, fluxion.priority_status, text, smallint, text, text, boolean, boolean, boolean, text); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text) RETURNS TABLE(allowed boolean, reason text)
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_dimension text := lower(coalesce(p_dimension, ''));
  v_aiact_level text := lower(coalesce(p_aiact_risk_level, ''));
  v_is_dismissal boolean := (p_to_status = 'dismissed');
  v_is_sensitive boolean := false;
  v_notes_length int := coalesce(length(trim(p_priority_notes)), 0);
BEGIN
  IF p_user_role IN ('auditor', 'viewer') THEN
    RETURN QUERY SELECT false, 'Rol sin permisos de escritura sobre prioridad'::text;
    RETURN;
  END IF;

  IF NOT v_is_dismissal THEN
    IF p_to_status = 'prioritized' AND p_user_role IN ('admin', 'dpo', 'technical', 'executive') THEN
      RETURN QUERY SELECT true, 'Cambio libre: subir a prioritized'::text;
      RETURN;
    END IF;

    IF p_from_status = 'pending_review'
       AND p_to_status = 'monitoring'
       AND p_user_role IN ('admin', 'dpo', 'technical', 'executive')
    THEN
      RETURN QUERY SELECT true, 'Cambio libre: pending_review -> monitoring'::text;
      RETURN;
    END IF;

    RETURN QUERY SELECT true, 'Cambio permitido'::text;
    RETURN;
  END IF;

  v_is_sensitive := (
    p_s_default >= 8
    OR coalesce(p_has_minors, false)
    OR coalesce(p_biometric, false)
    OR coalesce(p_vulnerable_groups, false)
    OR (
      v_aiact_level IN ('high', 'prohibited')
      AND v_dimension IN ('legal_b', 'seguridad', 'etica')
    )
  );

  IF NOT v_is_sensitive THEN
    IF p_user_role IN ('admin', 'dpo', 'technical') THEN
      RETURN QUERY SELECT true, 'Descarte de modo no sensible permitido'::text;
      RETURN;
    END IF;

    RETURN QUERY SELECT false, 'Solo admin, dpo o technical pueden descartar modos no sensibles'::text;
    RETURN;
  END IF;

  IF p_user_role != 'admin' THEN
    RETURN QUERY SELECT false, 'Modo sensible: solo admin puede descartar este modo de fallo'::text;
    RETURN;
  END IF;

  IF v_notes_length < 80 THEN
    RETURN QUERY SELECT false, 'Justificación insuficiente: se requieren al menos 80 caracteres para descartar un modo sensible'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Descarte de modo sensible autorizado'::text;
END;
$$;


ALTER FUNCTION fluxion.check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text) OWNER TO postgres;

--
-- Name: FUNCTION check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text); Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON FUNCTION fluxion.check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text) IS 'Verifica si un usuario puede cambiar priority_status. Restringe especialmente el paso a dismissed para modos sensibles.';


--
-- Name: compute_next_run(text, integer, integer, integer, timestamp with time zone); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.compute_next_run(p_frequency text, p_day_of_week integer, p_day_of_month integer, p_month_of_year integer, p_from timestamp with time zone DEFAULT now()) RETURNS timestamp with time zone
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_result        timestamptz;
  v_date          date;
  v_current_isodow int;
  v_target_isodow  int;
  v_days_until     int;
  v_base_year      int;
  v_base_month     int;
  v_days_in_month  int;
  v_target_day     int;
BEGIN
  CASE p_frequency

    WHEN 'daily' THEN
      -- Mañana a las 08:00 UTC
      v_result := date_trunc('day', p_from) + interval '1 day 8 hours';

    WHEN 'weekly' THEN
      -- Próxima ocurrencia del día de la semana (sin contar hoy)
      -- ISODOW: 1=Lun … 7=Dom; p_day_of_week: 0=Lun … 6=Dom
      v_current_isodow := EXTRACT(ISODOW FROM p_from::date)::int;
      v_target_isodow  := CASE WHEN p_day_of_week = 6 THEN 7 ELSE COALESCE(p_day_of_week, 0) + 1 END;
      v_days_until     := (v_target_isodow - v_current_isodow + 7) % 7;
      IF v_days_until = 0 THEN v_days_until := 7; END IF;
      v_result := (p_from::date + v_days_until)::timestamptz + interval '8 hours';

    WHEN 'biweekly' THEN
      -- Exactamente 14 días desde from
      v_result := date_trunc('day', p_from) + interval '14 days 8 hours';

    WHEN 'monthly' THEN
      -- Próxima ocurrencia del día del mes
      v_base_year  := EXTRACT(YEAR  FROM p_from)::int;
      v_base_month := EXTRACT(MONTH FROM p_from)::int;
      v_days_in_month := DATE_PART('days',
        make_date(v_base_year, v_base_month, 1) + interval '1 month - 1 day'
      )::int;
      v_target_day := LEAST(COALESCE(p_day_of_month, 1), v_days_in_month);
      v_date := make_date(v_base_year, v_base_month, v_target_day);
      IF v_date <= p_from::date THEN
        -- Siguiente mes
        IF v_base_month = 12 THEN
          v_base_year  := v_base_year + 1;
          v_base_month := 1;
        ELSE
          v_base_month := v_base_month + 1;
        END IF;
        v_days_in_month := DATE_PART('days',
          make_date(v_base_year, v_base_month, 1) + interval '1 month - 1 day'
        )::int;
        v_target_day := LEAST(COALESCE(p_day_of_month, 1), v_days_in_month);
        v_date := make_date(v_base_year, v_base_month, v_target_day);
      END IF;
      v_result := v_date::timestamptz + interval '8 hours';

    WHEN 'quarterly' THEN
      -- 3 meses desde from, día 1 del mes resultante
      v_result := date_trunc('month', p_from) + interval '3 months 8 hours';

    WHEN 'annually' THEN
      -- Próxima ocurrencia de mes+día
      v_base_year := EXTRACT(YEAR FROM p_from)::int;
      v_target_day := LEAST(COALESCE(p_day_of_month, 1), 28);
      v_date := make_date(v_base_year, COALESCE(p_month_of_year, 1), v_target_day);
      IF v_date <= p_from::date THEN
        v_date := make_date(v_base_year + 1, COALESCE(p_month_of_year, 1), v_target_day);
      END IF;
      v_result := v_date::timestamptz + interval '8 hours';

    ELSE
      v_result := date_trunc('day', p_from) + interval '1 day 8 hours';

  END CASE;

  RETURN v_result;
END;
$$;


ALTER FUNCTION fluxion.compute_next_run(p_frequency text, p_day_of_week integer, p_day_of_month integer, p_month_of_year integer, p_from timestamp with time zone) OWNER TO postgres;

--
-- Name: current_organization_id(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.current_organization_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'fluxion', 'public'
    AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM fluxion.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_org_id;
END;
$$;


ALTER FUNCTION fluxion.current_organization_id() OWNER TO postgres;

--
-- Name: FUNCTION current_organization_id(); Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON FUNCTION fluxion.current_organization_id() IS 'Shim de compatibilidad para migraciones legacy de treatment schema. 023 reemplaza las policies que la usan por el patrón real basado en organization_members.';


--
-- Name: expire_invitations(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.expire_invitations() RETURNS void
    LANGUAGE sql
    AS $$
  UPDATE fluxion.invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
$$;


ALTER FUNCTION fluxion.expire_invitations() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  new_org_id      UUID;
  pending_invite  RECORD;
  user_full_name  TEXT;
BEGIN
  -- Construir full_name desde los metadatos del usuario
  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(
      CONCAT(
        NEW.raw_user_meta_data->>'first_name',
        ' ',
        NEW.raw_user_meta_data->>'last_name'
      )
    ), ''),
    NEW.email
  );

  -- Buscar invitación pendiente para este email
  SELECT * INTO pending_invite
  FROM fluxion.invitations
  WHERE email = NEW.email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN
    -- Usuario invitado: crear perfil en la org que lo invitó con el rol asignado
    INSERT INTO fluxion.profiles (user_id, organization_id, full_name, role)
    VALUES (NEW.id, pending_invite.organization_id, user_full_name, pending_invite.role);

    -- Marcar invitación como aceptada
    UPDATE fluxion.invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = pending_invite.id;

  ELSE
    -- Registro directo: crear organización y perfil como org_admin
    INSERT INTO fluxion.organizations (name, slug)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_name'), ''), 'Mi Organización'),
      'org-' || substr(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_org_id;

    INSERT INTO fluxion.profiles (user_id, organization_id, full_name, role)
    VALUES (NEW.id, new_org_id, user_full_name, 'org_admin');
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.handle_new_user() OWNER TO postgres;

--
-- Name: init_recurrence_next_run(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.init_recurrence_next_run() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.next_run_at IS NULL THEN
    NEW.next_run_at := fluxion.compute_next_run(
      NEW.frequency, NEW.day_of_week, NEW.day_of_month, NEW.month_of_year, now()
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.init_recurrence_next_run() OWNER TO postgres;

--
-- Name: process_task_recurrences(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.process_task_recurrences() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  rec          record;
  new_task_id  uuid;
  v_title      text;
  v_due_date   date;
  v_created    int := 0;
BEGIN
  FOR rec IN
    SELECT r.*,
           p.id AS creator_profile_id
    FROM   fluxion.task_recurrences r
    LEFT JOIN fluxion.profiles p ON p.id = r.created_by
    WHERE  r.active = true
      AND  r.next_run_at <= now()
  LOOP
    -- Sustituir variables en el título
    v_title := rec.title;
    v_title := replace(v_title, '{{date}}',    to_char(now() AT TIME ZONE 'UTC', 'DD/MM/YYYY'));
    v_title := replace(v_title, '{{month}}',   to_char(now() AT TIME ZONE 'UTC', 'MM/YYYY'));
    v_title := replace(v_title, '{{year}}',    to_char(now() AT TIME ZONE 'UTC', 'YYYY'));
    v_title := replace(v_title, '{{quarter}}', 'Q' || EXTRACT(QUARTER FROM now())::text
                                               || ' ' || EXTRACT(YEAR FROM now())::text);

    v_due_date := now()::date + rec.due_offset_days;

    -- Crear tarea
    INSERT INTO fluxion.tasks (
      organization_id, system_id, title, description,
      status, priority, source_type, source_id,
      assignee_id, created_by, due_date, tags
    ) VALUES (
      rec.organization_id, rec.system_id, v_title, rec.description,
      'todo', rec.priority, 'manual', NULL,
      rec.assignee_id, rec.creator_profile_id, v_due_date, rec.tags
    )
    RETURNING id INTO new_task_id;

    -- Si la recurrencia tiene plantilla, copiar el checklist
    IF rec.template_id IS NOT NULL THEN
      INSERT INTO fluxion.task_checklist_items (task_id, label, position)
      SELECT new_task_id,
             (item_val ->> 'label')::text,
             ((row_number() OVER ()) * 10)::integer
      FROM   fluxion.task_templates t,
             jsonb_array_elements(t.checklist) AS item_val
      WHERE  t.id = rec.template_id;
    END IF;

    -- Registrar ejecución
    INSERT INTO fluxion.task_recurrence_runs (recurrence_id, task_id, scheduled_for, triggered_by)
    VALUES (rec.id, new_task_id, rec.next_run_at::date, 'cron');

    -- Actualizar timestamps y calcular próxima ejecución
    UPDATE fluxion.task_recurrences
    SET  last_run_at = now(),
         next_run_at = fluxion.compute_next_run(
           rec.frequency, rec.day_of_week, rec.day_of_month, rec.month_of_year, now()
         )
    WHERE id = rec.id;

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;


ALTER FUNCTION fluxion.process_task_recurrences() OWNER TO postgres;

--
-- Name: recalculate_plan_zone_target(uuid); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_ai_act_floor  text;
  v_zone_fmea     text := 'zona_iv';
  v_s_max         smallint := 0;
  v_ge8_count     int := 0;
  v_ge8_dims      int := 0;
  v_ge7_count     int := 0;
  v_ge7_dims      int := 0;
  v_ge6_count     int := 0;
  v_ge6_dims      int := 0;
BEGIN
  SELECT ai_act_floor
  INTO v_ai_act_floor
  FROM fluxion.treatment_plans
  WHERE id = p_plan_id;

  SELECT COALESCE(MAX(projected.s_proj), 0)
  INTO v_s_max
  FROM (
    SELECT COALESCE(
      CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END,
      ta.s_actual_at_creation
    ) AS s_proj
    FROM fluxion.treatment_actions ta
    WHERE ta.plan_id = p_plan_id
  ) projected;

  SELECT COUNT(*), COUNT(DISTINCT fm.dimension_id)
  INTO v_ge8_count, v_ge8_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 8;

  SELECT COUNT(*), COUNT(DISTINCT fm.dimension_id)
  INTO v_ge7_count, v_ge7_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 7;

  SELECT COUNT(*), COUNT(DISTINCT fm.dimension_id)
  INTO v_ge6_count, v_ge6_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 6;

  IF    v_s_max >= 9 THEN v_zone_fmea := 'zona_i';
  ELSIF v_s_max >= 8 THEN v_zone_fmea := 'zona_ii';
  ELSIF v_s_max >= 7 THEN v_zone_fmea := 'zona_iii';
  ELSE                    v_zone_fmea := 'zona_iv';
  END IF;

  IF v_ge8_count >= 3 AND v_ge8_dims >= 2 AND v_zone_fmea = 'zona_iv' THEN
    v_zone_fmea := 'zona_i';
  ELSIF v_ge7_count >= 5 AND v_ge7_dims >= 3 AND v_zone_fmea IN ('zona_iv','zona_iii') THEN
    v_zone_fmea := 'zona_ii';
  ELSIF v_ge6_count >= 8 AND v_ge6_dims >= 2 AND v_zone_fmea = 'zona_iv' THEN
    v_zone_fmea := 'zona_iii';
  END IF;

  RETURN CASE
    WHEN v_ai_act_floor = 'zona_i' THEN 'zona_i'
    WHEN v_ai_act_floor = 'zona_ii' AND v_zone_fmea IN ('zona_iv', 'zona_iii') THEN 'zona_ii'
    WHEN v_ai_act_floor = 'zona_iii' AND v_zone_fmea = 'zona_iv' THEN 'zona_iii'
    ELSE v_zone_fmea
  END;
END;
$$;


ALTER FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION recalculate_plan_zone_target(p_plan_id uuid); Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid) IS 'Calcula la zona proyectada del plan usando los S_residual objetivo de las acciones de mitigación. Aplica los mismos dos ejes (máximo individual + perfil agregado) más el suelo AI Act. Llamar después de confirmar/modificar cualquier treatment_action.';


--
-- Name: s_actual_to_task_priority(smallint); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.s_actual_to_task_priority(p_s_actual smallint) RETURNS fluxion.task_priority
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_s_actual = 9 THEN 'critical'::fluxion.task_priority
    WHEN p_s_actual = 8 THEN 'high'::fluxion.task_priority
    WHEN p_s_actual >= 6 THEN 'medium'::fluxion.task_priority
    ELSE                      'low'::fluxion.task_priority
  END;
$$;


ALTER FUNCTION fluxion.s_actual_to_task_priority(p_s_actual smallint) OWNER TO postgres;

--
-- Name: set_session_number(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.set_session_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  SELECT COALESCE(MAX(session_number), 0) + 1
  INTO NEW.session_number
  FROM fluxion.committee_sessions
  WHERE committee_id = NEW.committee_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.set_session_number() OWNER TO postgres;

--
-- Name: set_task_checklist_updated_at(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.set_task_checklist_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION fluxion.set_task_checklist_updated_at() OWNER TO postgres;

--
-- Name: set_task_recurrences_updated_at(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.set_task_recurrences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION fluxion.set_task_recurrences_updated_at() OWNER TO postgres;

--
-- Name: set_task_templates_updated_at(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.set_task_templates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION fluxion.set_task_templates_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.set_updated_at() OWNER TO postgres;

--
-- Name: trg_task_done_propagate(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.trg_task_done_propagate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Solo actúa cuando el status cambia a 'done'
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    -- Propagar a treatment_action si es el source
    IF NEW.source_type = 'treatment_action' AND NEW.source_id IS NOT NULL THEN
      UPDATE fluxion.treatment_actions
      SET status = 'completed', completed_at = now()
      WHERE id = NEW.source_id
        AND status NOT IN ('completed', 'accepted', 'cancelled');
    END IF;
  END IF;

  -- Limpiar completed_at si se reabre
  IF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.trg_task_done_propagate() OWNER TO postgres;

--
-- Name: trg_treatment_action_create_task(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.trg_treatment_action_create_task() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_system_id   uuid;
  v_mode_name   text;
  v_task_title  text;
  v_task_id     uuid;
  v_priority    fluxion.task_priority;
BEGIN
  -- Las acciones 'aceptar' no generan tarea activa
  IF NEW.option = 'aceptar' THEN
    RETURN NEW;
  END IF;

  -- Obtener system_id desde el plan
  SELECT system_id INTO v_system_id
  FROM fluxion.treatment_plans
  WHERE id = NEW.plan_id;

  -- Obtener nombre del modo de fallo desde el catálogo
  SELECT fm.name INTO v_mode_name
  FROM fluxion.fmea_items fi
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE fi.id = NEW.fmea_item_id;

  -- Construir título descriptivo
  v_task_title := CASE NEW.option
    WHEN 'mitigar'    THEN 'Mitigar: '
    WHEN 'transferir' THEN 'Transferir: '
    WHEN 'evitar'     THEN 'Evitar: '
    WHEN 'diferir'    THEN 'Diferir: '
    ELSE                   'Acción: '
  END || COALESCE(v_mode_name, 'modo de fallo');

  -- Calcular prioridad según S_actual
  v_priority := fluxion.s_actual_to_task_priority(NEW.s_actual_at_creation);

  -- Crear la tarea
  INSERT INTO fluxion.tasks (
    organization_id,
    system_id,
    title,
    description,
    status,
    priority,
    source_type,
    source_id,
    assignee_id,
    due_date
  ) VALUES (
    NEW.organization_id,
    v_system_id,
    v_task_title,
    NEW.evidence_description,
    fluxion.action_status_to_task_status(NEW.status),
    v_priority,
    'treatment_action',
    NEW.id,
    NEW.owner_id,
    NEW.due_date
  )
  RETURNING id INTO v_task_id;

  -- Escribir backlink en la propia fila (BEFORE trigger, podemos mutar NEW)
  NEW.task_id := v_task_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.trg_treatment_action_create_task() OWNER TO postgres;

--
-- Name: trg_treatment_action_sync_task(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.trg_treatment_action_sync_task() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sync solo si cambiaron campos relevantes
  IF NEW.status        IS DISTINCT FROM OLD.status
  OR NEW.owner_id      IS DISTINCT FROM OLD.owner_id
  OR NEW.due_date      IS DISTINCT FROM OLD.due_date
  THEN
    UPDATE fluxion.tasks SET
      status       = fluxion.action_status_to_task_status(NEW.status),
      assignee_id  = NEW.owner_id,
      due_date     = NEW.due_date,
      completed_at = CASE
                       WHEN NEW.status IN ('completed', 'accepted')
                         THEN COALESCE(completed_at, now())
                       ELSE NULL
                     END
    WHERE id = NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.trg_treatment_action_sync_task() OWNER TO postgres;

--
-- Name: trigger_evidence_closes_action(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.trigger_evidence_closes_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Solo cuando el status pasa a 'completed' con evidencia
  IF NEW.status = 'completed'
     AND NEW.evidence_id IS NOT NULL
     AND OLD.status != 'completed'
  THEN
    -- Actualizar s_residual_achieved desde s_residual_target
    -- (el evaluador puede ajustarlo manualmente antes del cierre)
    IF NEW.s_residual_achieved IS NULL THEN
      NEW.s_residual_achieved := NEW.s_residual_target;
    END IF;

    -- Actualizar S_actual en fmea_items → la zona se recalculará
    IF NEW.option = 'mitigar' AND NEW.s_residual_achieved IS NOT NULL THEN
      UPDATE fluxion.fmea_items
      SET
        s_actual   = NEW.s_residual_achieved,
        updated_at = now()
      WHERE id = NEW.fmea_item_id;
    END IF;

    -- Marcar completed_at
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.trigger_evidence_closes_action() OWNER TO postgres;

--
-- Name: trigger_update_plan_zone_target(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.trigger_update_plan_zone_target() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE fluxion.treatment_plans
  SET
    zone_target       = fluxion.recalculate_plan_zone_target(NEW.plan_id),
    actions_completed = (
      SELECT COUNT(*) FROM fluxion.treatment_actions
      WHERE plan_id = NEW.plan_id
        AND status IN ('completed','accepted')
    ),
    updated_at = now()
  WHERE id = NEW.plan_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.trigger_update_plan_zone_target() OWNER TO postgres;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: fluxion; Owner: postgres
--

CREATE FUNCTION fluxion.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION fluxion.update_updated_at() OWNER TO postgres;

--
-- Name: search_chunks(public.vector, rag.source_type[], integer, double precision, jsonb, text); Type: FUNCTION; Schema: rag; Owner: postgres
--

CREATE FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, filter_metadata jsonb DEFAULT NULL::jsonb, filter_short_name text DEFAULT NULL::text) RETURNS TABLE(id uuid, document_id uuid, source_type rag.source_type, chunk_type rag.chunk_type, section_ref text, short_name text, content text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.source_type,
    c.chunk_type,
    c.section_ref,
    c.short_name,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM rag.chunks c
  WHERE (c.source_type = ANY(source_types))
    AND (filter_short_name IS NULL OR c.short_name = filter_short_name)
    AND (1 - (c.embedding <=> query_embedding) > match_threshold)
    AND c.is_active = true
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, filter_metadata jsonb, filter_short_name text) OWNER TO postgres;

--
-- Name: search_chunks(public.vector, rag.source_type[], integer, double precision, uuid, jsonb, text); Type: FUNCTION; Schema: rag; Owner: postgres
--

CREATE FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer DEFAULT 4, match_threshold double precision DEFAULT 0.50, org_id uuid DEFAULT NULL::uuid, filter_metadata jsonb DEFAULT NULL::jsonb, filter_short_name text DEFAULT NULL::text) RETURNS TABLE(id uuid, section_ref text, short_name text, content text, content_tokens integer, similarity double precision, metadata jsonb, source_type rag.source_type)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'rag', 'public'
    AS $$
    -- Chunks de normativa global
    SELECT
        c.id,
        c.section_ref,
        c.short_name,
        c.content,
        c.content_tokens,
        (1 - (c.embedding <=> query_embedding))::double precision AS similarity,
        c.metadata,
        c.source_type
    FROM rag.chunks c
    WHERE
        c.is_active = true
        AND c.source_type = ANY(source_types)
        AND (filter_short_name IS NULL OR c.short_name = filter_short_name)
        AND (filter_metadata   IS NULL OR c.metadata @> filter_metadata)
        AND (1 - (c.embedding <=> query_embedding)) >= match_threshold

    UNION ALL

    -- Chunks de documentos propios de la organización (si se pasa org_id)
    SELECT
        oc.id,
        oc.section_ref,
        oc.short_name,
        oc.content,
        oc.content_tokens,
        (1 - (oc.embedding <=> query_embedding))::double precision AS similarity,
        oc.metadata,
        oc.source_type
    FROM rag.organization_chunks oc
    WHERE
        org_id IS NOT NULL
        AND oc.organization_id = org_id
        AND oc.is_active = true
        AND oc.source_type = ANY(source_types)
        AND (filter_short_name IS NULL OR oc.short_name = filter_short_name)
        AND (filter_metadata   IS NULL OR oc.metadata @> filter_metadata)
        AND (1 - (oc.embedding <=> query_embedding)) >= match_threshold

    ORDER BY similarity DESC
    LIMIT match_count;
$$;


ALTER FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, org_id uuid, filter_metadata jsonb, filter_short_name text) OWNER TO postgres;

--
-- Name: search_chunks_hybrid(text, public.vector, rag.source_type[], integer, double precision, uuid, text); Type: FUNCTION; Schema: rag; Owner: postgres
--

CREATE FUNCTION rag.search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer DEFAULT 5, semantic_weight double precision DEFAULT 0.7, org_id uuid DEFAULT NULL::uuid, filter_short_name text DEFAULT NULL::text) RETURNS TABLE(id uuid, section_ref text, content text, summary text, metadata jsonb, short_name text, score double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      c.id,
      1 - (c.embedding <=> query_embedding) AS sem_score
    FROM rag.chunks c
    WHERE
      c.is_active = true
      AND c.source_type = ANY(source_types)
      AND (c.organization_id IS NULL OR c.organization_id = org_id)
      AND (filter_short_name IS NULL OR c.short_name = filter_short_name)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  keyword AS (
    SELECT
      c.id,
      -- Búsqueda full-text adaptativa según el idioma del chunk
      ts_rank(
        CASE c.language
          WHEN 'en' THEN to_tsvector('english', c.content)
          ELSE            to_tsvector('spanish', c.content)
        END,
        CASE c.language
          WHEN 'en' THEN plainto_tsquery('english', query_text)
          ELSE            plainto_tsquery('spanish', query_text)
        END
      ) AS kw_score
    FROM rag.chunks c
    WHERE
      c.is_active = true
      AND c.source_type = ANY(source_types)
      AND (c.organization_id IS NULL OR c.organization_id = org_id)
      AND (filter_short_name IS NULL OR c.short_name = filter_short_name)
      AND (
        -- Intentar en español primero, luego en inglés
        to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', query_text)
        OR
        to_tsvector('english', c.content) @@ plainto_tsquery('english', query_text)
      )
    LIMIT match_count * 3
  ),
  combined AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      (COALESCE(s.sem_score, 0) * semantic_weight)
      + (COALESCE(k.kw_score, 0) * (1 - semantic_weight)) AS score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT
    c.id,
    c.section_ref,
    c.content,
    c.summary,
    c.metadata,
    c.short_name,            -- columna directa, sin JOIN
    comb.score
  FROM combined comb
  JOIN rag.chunks c ON c.id = comb.id
  ORDER BY comb.score DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION rag.search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer, semantic_weight double precision, org_id uuid, filter_short_name text) OWNER TO postgres;

--
-- Name: FUNCTION search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer, semantic_weight double precision, org_id uuid, filter_short_name text); Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON FUNCTION rag.search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer, semantic_weight double precision, org_id uuid, filter_short_name text) IS 'Búsqueda híbrida: semántica (pgvector) + keyword (tsvector BM25). Mejor para queries con referencias exactas tipo "Art. 9(4)". filter_short_name filtra por reglamento: ej. ''RGPD'' en eu_regulation. BTS adaptativo: usa tsvector(spanish) o tsvector(english) según chunks.language. semantic_weight=0.7: 70% semántico, 30% keyword.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: causal_families; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.causal_families (
    id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE compliance.causal_families OWNER TO postgres;

--
-- Name: causal_node_failure_mode_links; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.causal_node_failure_mode_links (
    causal_node_id uuid NOT NULL,
    failure_mode_id uuid NOT NULL,
    confidence text NOT NULL,
    rationale text,
    source text DEFAULT 'gemini_semantic'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT causal_node_failure_mode_links_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


ALTER TABLE compliance.causal_node_failure_mode_links OWNER TO postgres;

--
-- Name: causal_nodes; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.causal_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    domain text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE compliance.causal_nodes OWNER TO postgres;

--
-- Name: causal_relationships; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.causal_relationships (
    id text NOT NULL,
    family_id text NOT NULL,
    source_node_id uuid NOT NULL,
    target_node_id uuid NOT NULL,
    type compliance.relationship_type NOT NULL,
    explanatory_mechanism text NOT NULL,
    activation_condition text NOT NULL,
    confidence compliance.confidence_level NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE compliance.causal_relationships OWNER TO postgres;

--
-- Name: control_templates; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.control_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    area text,
    created_at timestamp with time zone DEFAULT now(),
    guidance text,
    category text,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE compliance.control_templates OWNER TO postgres;

--
-- Name: evidence_types; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.evidence_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.evidence_types OWNER TO postgres;

--
-- Name: failure_mode_causal_relations; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.failure_mode_causal_relations (
    source_fm_id uuid NOT NULL,
    target_fm_id uuid NOT NULL,
    relation_type text,
    explanation text NOT NULL,
    activation_conditions jsonb DEFAULT '{}'::jsonb,
    confidence_level numeric(3,2) DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.failure_mode_causal_relations OWNER TO postgres;

--
-- Name: failure_mode_control_refs; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.failure_mode_control_refs (
    failure_mode_id uuid NOT NULL,
    control_template_id uuid NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE compliance.failure_mode_control_refs OWNER TO postgres;

--
-- Name: TABLE failure_mode_control_refs; Type: COMMENT; Schema: compliance; Owner: postgres
--

COMMENT ON TABLE compliance.failure_mode_control_refs IS 'Mapeo entre modos de fallo del catálogo FMEA y controles de mitigación. Permite sugerir controles automáticamente al definir el plan de tratamiento.';


--
-- Name: failure_modes; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.failure_modes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dimension_id text,
    code text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    r_value integer NOT NULL,
    i_value integer NOT NULL,
    d_value integer NOT NULL,
    e_value integer NOT NULL,
    w_calculated numeric(4,2) NOT NULL,
    s_default integer NOT NULL,
    activation_conditions jsonb DEFAULT '{}'::jsonb,
    rag_chunk_ids text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    bloque text DEFAULT ''::text NOT NULL,
    subcategoria text DEFAULT ''::text NOT NULL,
    tipo text DEFAULT ''::text NOT NULL,
    CONSTRAINT failure_modes_d_value_check CHECK (((d_value >= 0) AND (d_value <= 3))),
    CONSTRAINT failure_modes_e_value_check CHECK (((e_value >= 0) AND (e_value <= 3))),
    CONSTRAINT failure_modes_i_value_check CHECK (((i_value >= 0) AND (i_value <= 3))),
    CONSTRAINT failure_modes_r_value_check CHECK (((r_value >= 0) AND (r_value <= 3))),
    CONSTRAINT failure_modes_s_default_check CHECK (((s_default >= 2) AND (s_default <= 9)))
);


ALTER TABLE compliance.failure_modes OWNER TO postgres;

--
-- Name: frameworks; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.frameworks (
    id text NOT NULL,
    name text NOT NULL,
    version text,
    description text,
    rag_namespace text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.frameworks OWNER TO postgres;

--
-- Name: obligation_evidence_types; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.obligation_evidence_types (
    obligation_id uuid NOT NULL,
    evidence_type_id uuid NOT NULL,
    requirement_level text DEFAULT 'recommended'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.obligation_evidence_types OWNER TO postgres;

--
-- Name: obligations; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.obligations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    framework text NOT NULL,
    article text NOT NULL,
    title text NOT NULL,
    description text,
    scope text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.obligations OWNER TO postgres;

--
-- Name: requirement_control_mappings; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.requirement_control_mappings (
    requirement_id uuid NOT NULL,
    control_template_id uuid NOT NULL,
    is_sufficient_alone boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.requirement_control_mappings OWNER TO postgres;

--
-- Name: requirements; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_id text,
    article_ref text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    applies_to_role text[] DEFAULT '{all}'::text[],
    applies_to_risk_level text[] DEFAULT '{all}'::text[],
    activation_conditions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE compliance.requirements OWNER TO postgres;

--
-- Name: risk_dimensions; Type: TABLE; Schema: compliance; Owner: postgres
--

CREATE TABLE compliance.risk_dimensions (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    display_order integer NOT NULL
);


ALTER TABLE compliance.risk_dimensions OWNER TO postgres;

--
-- Name: agent_messages; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.agent_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    message_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_messages_role_check CHECK ((role = ANY (ARRAY['assistant'::text, 'tool_result'::text, 'user'::text])))
);


ALTER TABLE fluxion.agent_messages OWNER TO postgres;

--
-- Name: agent_sessions; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.agent_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid,
    agent_type text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    trigger text NOT NULL,
    chunks_retrieved integer DEFAULT 0 NOT NULL,
    rag_queries jsonb DEFAULT '[]'::jsonb NOT NULL,
    output jsonb,
    tokens_input integer,
    tokens_output integer,
    model text DEFAULT 'claude-sonnet-4-20250514'::text,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT agent_sessions_agent_type_check CHECK ((agent_type = ANY (ARRAY['classification'::text, 'fmea'::text, 'compliance'::text, 'assistant'::text]))),
    CONSTRAINT agent_sessions_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT agent_sessions_trigger_check CHECK ((trigger = ANY (ARRAY['initial'::text, 'reclassification'::text, 'ambiguity_resolution'::text, 'user_request'::text])))
);


ALTER TABLE fluxion.agent_sessions OWNER TO postgres;

--
-- Name: ai_system_classification_reviews; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.ai_system_classification_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    previous_risk_level text,
    new_risk_level text,
    previous_basis text,
    new_basis text,
    previous_reason text,
    new_reason text,
    previous_obligations jsonb DEFAULT '[]'::jsonb NOT NULL,
    new_obligations jsonb DEFAULT '[]'::jsonb NOT NULL,
    review_notes text,
    changed_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.ai_system_classification_reviews OWNER TO postgres;

--
-- Name: TABLE ai_system_classification_reviews; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.ai_system_classification_reviews IS 'Histórico auditable de revisiones de clasificación AI Act sobre un sistema.';


--
-- Name: COLUMN ai_system_classification_reviews.changed_fields; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_system_classification_reviews.changed_fields IS 'Diff estructurado de campos modificados durante la revisión.';


--
-- Name: ai_system_history; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.ai_system_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    event_type text NOT NULL,
    event_title text NOT NULL,
    event_summary text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.ai_system_history OWNER TO postgres;

--
-- Name: TABLE ai_system_history; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.ai_system_history IS 'Timeline auditable de eventos funcionales y de gobierno sobre un sistema de IA.';


--
-- Name: COLUMN ai_system_history.payload; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_system_history.payload IS 'Datos estructurados del evento para reconstruir cambios, diffs o metadatos operativos.';


--
-- Name: ai_systems; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.ai_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    version text DEFAULT '1.0.0'::text NOT NULL,
    internal_id text,
    domain fluxion.ai_system_domain NOT NULL,
    status fluxion.ai_system_status NOT NULL,
    deployed_at date,
    description text,
    technical_description text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    intended_use text,
    prohibited_uses text,
    output_type fluxion.ai_output_type,
    fully_automated boolean,
    interacts_persons boolean DEFAULT false NOT NULL,
    target_users text[] DEFAULT '{}'::text[] NOT NULL,
    usage_scale fluxion.usage_scale,
    geo_scope text[] DEFAULT '{}'::text[] NOT NULL,
    is_ai_system boolean,
    is_gpai boolean DEFAULT false NOT NULL,
    prohibited_practice boolean DEFAULT false NOT NULL,
    affects_persons boolean,
    vulnerable_groups boolean DEFAULT false NOT NULL,
    involves_minors boolean DEFAULT false NOT NULL,
    uses_biometric_data boolean DEFAULT false NOT NULL,
    manages_critical_infra boolean DEFAULT false NOT NULL,
    aiact_risk_level fluxion.aiact_risk_level DEFAULT 'pending'::fluxion.aiact_risk_level NOT NULL,
    aiact_risk_basis text,
    aiact_risk_reason text,
    aiact_obligations text[] DEFAULT '{}'::text[] NOT NULL,
    aiact_classified_at timestamp with time zone,
    aiact_classified_by uuid,
    processes_personal_data boolean,
    data_categories text[] DEFAULT '{}'::text[] NOT NULL,
    special_categories text[] DEFAULT '{}'::text[] NOT NULL,
    legal_bases text[] DEFAULT '{}'::text[] NOT NULL,
    data_sources text[] DEFAULT '{}'::text[] NOT NULL,
    training_data_doc fluxion.doc_status,
    data_volume fluxion.data_volume,
    data_retention fluxion.data_retention,
    dpia_completed fluxion.doc_status,
    ai_system_type fluxion.ai_system_type,
    base_model text,
    external_model text,
    external_provider text,
    frameworks text,
    provider_origin fluxion.ai_provider_origin,
    has_fine_tuning boolean DEFAULT false NOT NULL,
    has_external_tools boolean DEFAULT false NOT NULL,
    active_environments text[] DEFAULT '{}'::text[] NOT NULL,
    mlops_integration fluxion.mlops_integration,
    ai_owner text,
    responsible_team text,
    tech_lead text,
    executive_sponsor text,
    dpo_involved boolean DEFAULT false NOT NULL,
    has_sla boolean DEFAULT false NOT NULL,
    review_frequency fluxion.review_frequency,
    incident_contact text,
    critical_providers text,
    has_tech_doc fluxion.doc_status,
    has_logging fluxion.doc_status,
    has_human_oversight fluxion.doc_status,
    oversight_type fluxion.oversight_type,
    has_complaint_mechanism boolean DEFAULT false NOT NULL,
    has_risk_assessment fluxion.doc_status,
    residual_risk fluxion.residual_risk,
    mitigation_notes text,
    has_adversarial_test boolean DEFAULT false NOT NULL,
    cert_status fluxion.cert_status,
    next_audit_date date,
    iso_42001_score smallint,
    iso_42001_updated_at timestamp with time zone,
    iso_42001_checks jsonb DEFAULT '[]'::jsonb NOT NULL,
    code text,
    classification_session_id uuid,
    classification_confirmed_at timestamp with time zone,
    requires_agent_review boolean DEFAULT false NOT NULL,
    classification_note text,
    legal_bases_art9 text[] DEFAULT '{}'::text[] NOT NULL,
    intl_data_transfers boolean DEFAULT false NOT NULL,
    oss_model_name text,
    oss_license text,
    has_explainability fluxion.doc_status,
    last_review_date date,
    current_classification_event_id uuid,
    CONSTRAINT iso_score_range CHECK (((iso_42001_score IS NULL) OR ((iso_42001_score >= 0) AND (iso_42001_score <= 100)))),
    CONSTRAINT name_not_empty CHECK ((char_length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT prohibited_is_high CHECK (((prohibited_practice = false) OR (aiact_risk_level = ANY (ARRAY['prohibited'::fluxion.aiact_risk_level, 'pending'::fluxion.aiact_risk_level])))),
    CONSTRAINT version_format CHECK ((version ~ '^\d+\.\d+(\.\d+)?$'::text))
);


ALTER TABLE fluxion.ai_systems OWNER TO postgres;

--
-- Name: TABLE ai_systems; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.ai_systems IS 'Inventario centralizado de sistemas de IA. Cubre AI Act, ISO 42001, RGPD y DORA.';


--
-- Name: COLUMN ai_systems.intended_use; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.intended_use IS 'AI Act Art. 11 — Uso previsto documentado, obligatorio para sistemas de alto riesgo.';


--
-- Name: COLUMN ai_systems.is_gpai; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.is_gpai IS 'AI Act Art. 3(63) y Art. 51-53 — Modelo de IA de propósito general (GPT, Claude, Llama...).';


--
-- Name: COLUMN ai_systems.prohibited_practice; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.prohibited_practice IS 'AI Act Art. 5 — Si TRUE, el sistema no puede desplegarse en la UE. Activa alerta crítica.';


--
-- Name: COLUMN ai_systems.aiact_risk_level; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.aiact_risk_level IS 'Clasificación de riesgo según Reglamento (UE) 2024/1689. Calculada por el agente y revisable por el DPO.';


--
-- Name: COLUMN ai_systems.aiact_obligations; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.aiact_obligations IS 'DEPRECATED: usar system_obligations WHERE archived_at IS NULL. Mantenido solo por retrocompatibilidad.';


--
-- Name: COLUMN ai_systems.processes_personal_data; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.processes_personal_data IS 'RGPD Art. 4 — Determina si aplica todo el régimen de protección de datos personales.';


--
-- Name: COLUMN ai_systems.special_categories; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.special_categories IS 'RGPD Art. 9 — Categorías especiales de datos. Requieren base legal explícita y medidas reforzadas.';


--
-- Name: COLUMN ai_systems.dpia_completed; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.dpia_completed IS 'RGPD Art. 35 — Estado de la DPIA: si, proceso o no.';


--
-- Name: COLUMN ai_systems.critical_providers; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.critical_providers IS 'DORA Art. 28 — Proveedores TIC que prestan servicios críticos. Deben gestionarse y registrarse formalmente.';


--
-- Name: COLUMN ai_systems.has_tech_doc; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.has_tech_doc IS 'AI Act Art. 11 + Anexo IV — Documentación técnica completa. Obligatoria para sistemas de alto riesgo.';


--
-- Name: COLUMN ai_systems.has_logging; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.has_logging IS 'AI Act Art. 12 — Estado del logging: si, parcial o no.';


--
-- Name: COLUMN ai_systems.has_human_oversight; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.has_human_oversight IS 'AI Act Art. 14 — Estado de supervisión humana: si, parcial o no.';


--
-- Name: COLUMN ai_systems.has_risk_assessment; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.has_risk_assessment IS 'AI Act Art. 9 + ISO 42001 §6.1 — Estado de la evaluación de riesgos: si, proceso o no.';


--
-- Name: COLUMN ai_systems.has_adversarial_test; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.has_adversarial_test IS 'AI Act Art. 15 — Precisión, robustez y ciberseguridad. Pruebas frente a manipulación o uso malicioso.';


--
-- Name: COLUMN ai_systems.iso_42001_score; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_score IS '[DEPRECATED desde 2026-04-28] Score 0-100 calculado con 10 checks de gobernanza. Sustituido por aisia_assessments. Mantener para backward-compat.';


--
-- Name: COLUMN ai_systems.iso_42001_updated_at; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_updated_at IS '[DEPRECATED desde 2026-04-28] Timestamp de la última recalculación automática. Sustituido por aisia_assessments.updated_at. Mantener para backward-compat.';


--
-- Name: COLUMN ai_systems.iso_42001_checks; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_checks IS '[DEPRECATED desde 2026-04-28] Snapshot JSONB de los 10 checks individuales. Sustituido por aisia_sections. Mantener para backward-compat.';


--
-- Name: aisia_ai_generations; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.aisia_ai_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    section_code text NOT NULL,
    prompt_summary text,
    generated_content jsonb DEFAULT '{}'::jsonb NOT NULL,
    model_used text,
    triggered_by uuid NOT NULL,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted boolean,
    accepted_at timestamp with time zone,
    CONSTRAINT aisia_ai_generations_code_check CHECK ((section_code = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text, 'S4'::text, 'S5'::text, 'S6'::text])))
);


ALTER TABLE fluxion.aisia_ai_generations OWNER TO postgres;

--
-- Name: TABLE aisia_ai_generations; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.aisia_ai_generations IS 'Historial de generaciones IA por sección AISIA. Inmutable.';


--
-- Name: aisia_assessments; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.aisia_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version smallint DEFAULT 1 NOT NULL,
    title text,
    created_by uuid NOT NULL,
    submitted_by uuid,
    submitted_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    approval_minutes_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aisia_assessments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE fluxion.aisia_assessments OWNER TO postgres;

--
-- Name: TABLE aisia_assessments; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.aisia_assessments IS 'Evaluación de Impacto del Sistema IA (AISIA). Satisface controles ISO 42001 A.5.2–A.5.5 cuando status = approved.';


--
-- Name: aisia_sections; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.aisia_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    section_code text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    last_generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aisia_sections_code_check CHECK ((section_code = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text, 'S4'::text, 'S5'::text, 'S6'::text]))),
    CONSTRAINT aisia_sections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'complete'::text])))
);


ALTER TABLE fluxion.aisia_sections OWNER TO postgres;

--
-- Name: TABLE aisia_sections; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.aisia_sections IS 'Secciones S1–S6 de una evaluación AISIA. Contenido en JSONB.';


--
-- Name: api_keys; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.api_keys OWNER TO postgres;

--
-- Name: TABLE api_keys; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.api_keys IS 'Claves API para acceso machine-to-machine. La clave completa nunca se almacena, solo su hash SHA-256.';


--
-- Name: assistant_conversations; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.assistant_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text,
    context_page text,
    context_system uuid,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.assistant_conversations OWNER TO postgres;

--
-- Name: audit_log; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_id uuid,
    actor_name text,
    actor_email text,
    action text NOT NULL,
    target_type text,
    target_id text,
    target_label text,
    metadata jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.audit_log OWNER TO postgres;

--
-- Name: TABLE audit_log; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.audit_log IS 'Registro de auditoría de actividad de la plataforma. Requerido por ISO 42001 cláusula 9.2 y A.6.2.6.';


--
-- Name: COLUMN audit_log.actor_name; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.audit_log.actor_name IS 'Nombre del actor en el momento del evento. Denormalizado para persistencia.';


--
-- Name: COLUMN audit_log.action; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.audit_log.action IS 'Formato: <dominio>.<verbo> — e.g. member.invited, org.settings_updated, session.revoked';


--
-- Name: causal_graph_instances; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.causal_graph_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id uuid NOT NULL,
    graph_nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.causal_graph_instances OWNER TO postgres;

--
-- Name: classification_diffs; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.classification_diffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classification_event_id uuid NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    obligation_key text NOT NULL,
    obligation_label text NOT NULL,
    diff_type fluxion.diff_type NOT NULL,
    previous_obligation_id uuid,
    previous_status text,
    resolution fluxion.diff_resolution,
    resolution_note text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.classification_diffs OWNER TO postgres;

--
-- Name: classification_events; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.classification_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    version integer NOT NULL,
    method fluxion.classification_method NOT NULL,
    risk_level text NOT NULL,
    risk_label text NOT NULL,
    basis text,
    reason text,
    obligations_set text[] NOT NULL,
    classification_factors jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    review_notes text,
    status fluxion.classification_event_status DEFAULT 'pending_reconciliation'::fluxion.classification_event_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT classification_events_risk_level_check CHECK ((risk_level = ANY (ARRAY['prohibited'::text, 'high'::text, 'limited'::text, 'minimal'::text, 'gpai'::text])))
);


ALTER TABLE fluxion.classification_events OWNER TO postgres;

--
-- Name: committee_members; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.committee_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    committee_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    profile_id uuid,
    external_name text,
    external_email text,
    external_org text,
    external_role_desc text,
    committee_role fluxion.committee_member_role DEFAULT 'member'::fluxion.committee_member_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    joined_at date DEFAULT CURRENT_DATE NOT NULL,
    left_at date,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_identity_check CHECK ((((profile_id IS NOT NULL) AND (external_email IS NULL)) OR ((profile_id IS NULL) AND (external_email IS NOT NULL))))
);


ALTER TABLE fluxion.committee_members OWNER TO postgres;

--
-- Name: committee_sessions; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.committee_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    committee_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    session_number integer NOT NULL,
    session_type text DEFAULT 'ordinary'::text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    status fluxion.committee_session_status DEFAULT 'scheduled'::fluxion.committee_session_status NOT NULL,
    location text,
    agenda jsonb DEFAULT '[]'::jsonb,
    minutes_text text,
    minutes_locked boolean DEFAULT false NOT NULL,
    minutes_locked_at timestamp with time zone,
    minutes_locked_by uuid,
    decisions jsonb DEFAULT '[]'::jsonb,
    attendees jsonb DEFAULT '[]'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.committee_sessions OWNER TO postgres;

--
-- Name: committees; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.committees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    type fluxion.committee_type NOT NULL,
    name text NOT NULL,
    description text,
    cadence_months integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    established_at date,
    regulatory_basis text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.committees OWNER TO postgres;

--
-- Name: controls; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid,
    template_id uuid NOT NULL,
    status fluxion.control_status DEFAULT 'planned'::fluxion.control_status NOT NULL,
    compliance_score numeric(5,2) DEFAULT 0.0,
    owner_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.controls OWNER TO postgres;

--
-- Name: evidence_controls; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.evidence_controls (
    evidence_id uuid NOT NULL,
    control_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.evidence_controls OWNER TO postgres;

--
-- Name: evidence_expiry_alerts; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.evidence_expiry_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    alert_type text NOT NULL,
    evidence_title text NOT NULL,
    expires_at date NOT NULL,
    dismissed boolean DEFAULT false NOT NULL,
    dismissed_by uuid,
    dismissed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_expiry_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['expiry_30d'::text, 'expiry_7d'::text, 'expired'::text])))
);


ALTER TABLE fluxion.evidence_expiry_alerts OWNER TO postgres;

--
-- Name: TABLE evidence_expiry_alerts; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.evidence_expiry_alerts IS 'Alertas generadas por el cron diario para evidencias que caducan en 7 o 30 días.';


--
-- Name: evidences; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.evidences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    url text,
    uploaded_by uuid,
    applies_to_systems uuid[] DEFAULT '{}'::uuid[],
    regulatory_refs text[] DEFAULT '{}'::text[],
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    validated_by uuid,
    validated_at timestamp with time zone,
    type fluxion.evidence_type,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_from date,
    file_size integer,
    mime_type text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    storage_path text,
    external_url text,
    verification_status fluxion.evidence_verification_status DEFAULT 'pending'::fluxion.evidence_verification_status NOT NULL,
    CONSTRAINT chk_fluxion_evidences_location CHECK ((COALESCE(NULLIF(btrim(storage_path), ''::text), NULLIF(btrim(external_url), ''::text), NULLIF(btrim(url), ''::text)) IS NOT NULL))
);


ALTER TABLE fluxion.evidences OWNER TO postgres;

--
-- Name: COLUMN evidences.storage_path; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.evidences.storage_path IS 'Ruta del archivo en Supabase Storage cuando la evidencia se sube a la plataforma.';


--
-- Name: COLUMN evidences.external_url; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.evidences.external_url IS 'Enlace externo opcional a la evidencia cuando vive fuera de la plataforma.';


--
-- Name: COLUMN evidences.verification_status; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.evidences.verification_status IS 'Estado de validación de la evidencia dentro del flujo de treatment plans: pending, validated o rejected.';


--
-- Name: system_failure_modes; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_failure_modes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    failure_mode_id uuid NOT NULL,
    dimension_id text NOT NULL,
    activation_source text DEFAULT 'rule'::text NOT NULL,
    activation_reason text,
    activation_family_ids text[] DEFAULT '{}'::text[] NOT NULL,
    activation_family_labels text[] DEFAULT '{}'::text[] NOT NULL,
    confidence numeric(4,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority_status fluxion.priority_status DEFAULT 'pending_review'::fluxion.priority_status NOT NULL,
    priority_source fluxion.priority_source DEFAULT 'rules'::fluxion.priority_source NOT NULL,
    priority_notes text,
    priority_score smallint,
    priority_level text,
    priority_changed_by uuid,
    priority_changed_at timestamp with time zone,
    quota_dropped boolean DEFAULT false NOT NULL,
    priority_reason_code text,
    engine_version text,
    activation_signals jsonb,
    CONSTRAINT chk_dismissed_requires_notes CHECK (((priority_status <> 'dismissed'::fluxion.priority_status) OR ((priority_notes IS NOT NULL) AND (length(TRIM(BOTH FROM priority_notes)) > 0)))),
    CONSTRAINT chk_system_failure_modes_source CHECK ((activation_source = ANY (ARRAY['rule'::text, 'ai'::text, 'manual'::text]))),
    CONSTRAINT system_failure_modes_priority_level_check CHECK ((priority_level = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT system_failure_modes_priority_score_check CHECK (((priority_score >= 0) AND (priority_score <= 100)))
);


ALTER TABLE fluxion.system_failure_modes OWNER TO postgres;

--
-- Name: TABLE system_failure_modes; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.system_failure_modes IS 'Subset persistido de modos de fallo del catálogo compliance activados para un sistema concreto, con capa adicional de priorización operativa.';


--
-- Name: COLUMN system_failure_modes.activation_source; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.activation_source IS 'Origen de activación: rule para motor determinista, ai para refinado por agente y manual para intervención humana.';


--
-- Name: COLUMN system_failure_modes.activation_reason; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.activation_reason IS 'Justificación legible de por qué el modo quedó activado para el sistema.';


--
-- Name: COLUMN system_failure_modes.priority_status; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.priority_status IS 'Estado de priorización: pending_review -> prioritized | monitoring | dismissed. Solo prioritized entra en la cola principal de evaluación FMEA.';


--
-- Name: COLUMN system_failure_modes.priority_source; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.priority_source IS 'Origen de la priorización: rules (motor determinista), agent (refinado IA) o human (ajuste manual).';


--
-- Name: COLUMN system_failure_modes.priority_notes; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.priority_notes IS 'Justificación narrativa de cambios de prioridad, especialmente cuando un modo se descarta manualmente.';


--
-- Name: COLUMN system_failure_modes.priority_score; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.priority_score IS 'Índice 0-100 calculado para decidir urgencia de revisión. No recalcula ni modifica S_default.';


--
-- Name: COLUMN system_failure_modes.priority_level; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_failure_modes.priority_level IS 'Clasificación textual derivada del score: critical, high, medium o low.';


--
-- Name: failure_mode_priority_diagnostic_detail; Type: VIEW; Schema: fluxion; Owner: postgres
--

CREATE VIEW fluxion.failure_mode_priority_diagnostic_detail AS
 WITH base AS (
         SELECT sfm.id,
            sfm.organization_id,
            sfm.ai_system_id,
            sys.name AS system_name,
            fm.id AS failure_mode_id,
            fm.code,
            fm.name,
            fm.dimension_id,
            fm.bloque,
            fm.subcategoria,
            fm.s_default,
            fm.w_calculated,
            sfm.priority_status,
            sfm.priority_source,
            sfm.priority_score,
            sfm.priority_level,
            sfm.priority_notes,
            sfm.activation_family_ids,
            sfm.activation_family_labels,
            (sys.aiact_risk_level)::text AS aiact_risk_level,
            (sys.domain)::text AS domain,
            (sys.output_type)::text AS output_type,
            (sys.ai_system_type)::text AS ai_system_type,
            sys.affects_persons,
            sys.involves_minors,
            sys.vulnerable_groups,
            sys.uses_biometric_data,
            sys.manages_critical_infra,
            sys.is_gpai,
            sys.has_external_tools,
            (COALESCE(sys.affects_persons, false) OR COALESCE(sys.involves_minors, false) OR COALESCE(sys.vulnerable_groups, false) OR COALESCE(sys.uses_biometric_data, false) OR ((sys.aiact_risk_level)::text = ANY (ARRAY['high'::text, 'prohibited'::text]))) AS has_sensitive_signal,
            ((fm.s_default >= 8) OR (COALESCE(sys.uses_biometric_data, false) AND COALESCE(sys.affects_persons, false)) OR (COALESCE(sys.involves_minors, false) AND (fm.dimension_id = ANY (ARRAY['etica'::text, 'legal_b'::text, 'seguridad'::text]))) OR (COALESCE(sys.vulnerable_groups, false) AND (fm.dimension_id = ANY (ARRAY['etica'::text, 'legal_b'::text, 'seguridad'::text]))) OR (((sys.aiact_risk_level)::text = ANY (ARRAY['high'::text, 'prohibited'::text])) AND (fm.dimension_id = ANY (ARRAY['legal_b'::text, 'seguridad'::text, 'etica'::text])))) AS hard_override
           FROM ((fluxion.system_failure_modes sfm
             JOIN fluxion.ai_systems sys ON (((sys.id = sfm.ai_system_id) AND (sys.organization_id = sfm.organization_id))))
             JOIN compliance.failure_modes fm ON ((fm.id = sfm.failure_mode_id)))
        )
 SELECT base.id,
    base.organization_id,
    base.ai_system_id,
    base.system_name,
    base.failure_mode_id,
    base.code,
    base.name,
    base.dimension_id,
    base.bloque,
    base.subcategoria,
    base.s_default,
    base.w_calculated,
    base.priority_status,
    base.priority_source,
    base.priority_score,
    base.priority_level,
    base.priority_notes,
    base.activation_family_ids,
    base.activation_family_labels,
    base.aiact_risk_level,
    base.domain,
    base.output_type,
    base.ai_system_type,
    base.affects_persons,
    base.involves_minors,
    base.vulnerable_groups,
    base.uses_biometric_data,
    base.manages_critical_infra,
    base.is_gpai,
    base.has_external_tools,
    base.has_sensitive_signal,
    base.hard_override,
        CASE
            WHEN (base.s_default >= 8) THEN 'override_s_default_gte_8'::text
            WHEN ((base.uses_biometric_data = true) AND (base.affects_persons = true)) THEN 'override_biometric_plus_people'::text
            WHEN ((base.involves_minors = true) AND (base.dimension_id = ANY (ARRAY['etica'::text, 'legal_b'::text, 'seguridad'::text]))) THEN 'override_minors_sensitive_dimension'::text
            WHEN ((base.vulnerable_groups = true) AND (base.dimension_id = ANY (ARRAY['etica'::text, 'legal_b'::text, 'seguridad'::text]))) THEN 'override_vulnerable_sensitive_dimension'::text
            WHEN ((base.aiact_risk_level = ANY (ARRAY['high'::text, 'prohibited'::text])) AND (base.dimension_id = ANY (ARRAY['legal_b'::text, 'seguridad'::text, 'etica'::text]))) THEN 'override_aiact_sensitive_dimension'::text
            WHEN (base.priority_level = 'critical'::text) THEN 'critical'::text
            WHEN ((base.priority_level = 'high'::text) AND (base.priority_status = 'prioritized'::fluxion.priority_status)) THEN 'high_promoted'::text
            WHEN ((base.priority_status = 'monitoring'::fluxion.priority_status) AND (base.priority_level = 'high'::text)) THEN 'high_demoted_by_quota_or_rules'::text
            ELSE 'monitoring_non_priority'::text
        END AS priority_entry_reason,
        CASE
            WHEN (base.s_default >= 8) THEN 's_ge_8'::text
            WHEN (base.s_default = 7) THEN 's_7'::text
            WHEN (base.s_default = 6) THEN 's_6'::text
            WHEN (base.s_default = 5) THEN 's_5'::text
            ELSE 's_le_4'::text
        END AS s_default_bucket
   FROM base;


ALTER TABLE fluxion.failure_mode_priority_diagnostic_detail OWNER TO postgres;

--
-- Name: failure_mode_priority_diagnostic_families; Type: VIEW; Schema: fluxion; Owner: postgres
--

CREATE VIEW fluxion.failure_mode_priority_diagnostic_families AS
 SELECT detail.organization_id,
    detail.ai_system_id,
    detail.system_name,
    detail.id AS system_failure_mode_id,
    detail.failure_mode_id,
    detail.code,
    detail.name,
    detail.dimension_id,
    detail.s_default,
    detail.priority_status,
    detail.priority_level,
    detail.priority_score,
    family.family_id,
    family.family_label
   FROM (fluxion.failure_mode_priority_diagnostic_detail detail
     CROSS JOIN LATERAL UNNEST(detail.activation_family_ids, detail.activation_family_labels) family(family_id, family_label));


ALTER TABLE fluxion.failure_mode_priority_diagnostic_families OWNER TO postgres;

--
-- Name: failure_mode_priority_diagnostic_summary; Type: VIEW; Schema: fluxion; Owner: postgres
--

CREATE VIEW fluxion.failure_mode_priority_diagnostic_summary AS
 SELECT failure_mode_priority_diagnostic_detail.organization_id,
    failure_mode_priority_diagnostic_detail.ai_system_id,
    failure_mode_priority_diagnostic_detail.system_name,
    count(*) AS activated_count,
    count(*) FILTER (WHERE (failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status)) AS prioritized_count,
    count(*) FILTER (WHERE (failure_mode_priority_diagnostic_detail.priority_status = 'monitoring'::fluxion.priority_status)) AS monitoring_count,
    count(*) FILTER (WHERE (failure_mode_priority_diagnostic_detail.priority_status = 'dismissed'::fluxion.priority_status)) AS dismissed_count,
    count(*) FILTER (WHERE failure_mode_priority_diagnostic_detail.hard_override) AS hard_override_count,
    count(*) FILTER (WHERE (failure_mode_priority_diagnostic_detail.priority_level = 'critical'::text)) AS critical_count,
    count(*) FILTER (WHERE (failure_mode_priority_diagnostic_detail.priority_level = 'high'::text)) AS high_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.priority_level = 'high'::text))) AS prioritized_high_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.dimension_id = 'seguridad'::text))) AS prioritized_security_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.dimension_id = 'tecnica'::text))) AS prioritized_technical_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.dimension_id = 'legal_b'::text))) AS prioritized_legal_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.dimension_id = 'etica'::text))) AS prioritized_ethical_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.dimension_id = 'gobernanza'::text))) AS prioritized_governance_count,
    count(*) FILTER (WHERE ((failure_mode_priority_diagnostic_detail.priority_status = 'prioritized'::fluxion.priority_status) AND (failure_mode_priority_diagnostic_detail.dimension_id = 'roi'::text))) AS prioritized_roi_count
   FROM fluxion.failure_mode_priority_diagnostic_detail
  GROUP BY failure_mode_priority_diagnostic_detail.organization_id, failure_mode_priority_diagnostic_detail.ai_system_id, failure_mode_priority_diagnostic_detail.system_name;


ALTER TABLE fluxion.failure_mode_priority_diagnostic_summary OWNER TO postgres;

--
-- Name: fmea_evaluations; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.fmea_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid NOT NULL,
    state fluxion.evaluation_state DEFAULT 'draft'::fluxion.evaluation_state NOT NULL,
    evaluator_id uuid,
    approver_id uuid,
    approved_at timestamp with time zone,
    next_review_at timestamp with time zone,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cached_zone text,
    CONSTRAINT chk_fmea_evaluations_cached_zone CHECK (((cached_zone IS NULL) OR (cached_zone = ANY (ARRAY['zona_i'::text, 'zona_ii'::text, 'zona_iii'::text, 'zona_iv'::text]))))
);


ALTER TABLE fluxion.fmea_evaluations OWNER TO postgres;

--
-- Name: COLUMN fmea_evaluations.cached_zone; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.fmea_evaluations.cached_zone IS 'Zona FMEA cacheada solo al guardar borrador o enviar a revisión. La fuente de verdad siguen siendo los S_actual.';


--
-- Name: fmea_item_history; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.fmea_item_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    evaluation_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    actor_name text,
    event_type text NOT NULL,
    prev_o smallint,
    new_o smallint,
    prev_d smallint,
    new_d smallint,
    prev_s_actual smallint,
    new_s_actual smallint,
    prev_status text,
    new_status text,
    prev_second_review_status text,
    new_second_review_status text,
    notes text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fmea_item_history_event_type_check CHECK ((event_type = ANY (ARRAY['evaluated'::text, 'skipped'::text, 'second_review_approved'::text, 'second_review_rejected'::text])))
);


ALTER TABLE fluxion.fmea_item_history OWNER TO postgres;

--
-- Name: TABLE fmea_item_history; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.fmea_item_history IS 'Registro de trazabilidad por modo de fallo FMEA. Cada fila representa un cambio explícito de estado o valores realizado por un usuario.';


--
-- Name: fmea_items; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.fmea_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id uuid NOT NULL,
    failure_mode_id uuid NOT NULL,
    s_default_frozen integer NOT NULL,
    o_value integer,
    d_real_value integer,
    s_actual integer,
    s_residual integer,
    narrative_justification text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text NOT NULL,
    requires_second_review boolean DEFAULT false NOT NULL,
    skipped_at timestamp with time zone,
    second_review_status fluxion.fmea_second_review_status DEFAULT 'not_required'::fluxion.fmea_second_review_status NOT NULL,
    second_reviewed_by uuid,
    second_reviewed_at timestamp with time zone,
    second_review_notes text,
    CONSTRAINT chk_fmea_items_status CHECK ((status = ANY (ARRAY['pending'::text, 'evaluated'::text, 'skipped'::text]))),
    CONSTRAINT fmea_items_d_real_value_check CHECK (((d_real_value >= 1) AND (d_real_value <= 5))),
    CONSTRAINT fmea_items_o_value_check CHECK (((o_value >= 1) AND (o_value <= 5)))
);


ALTER TABLE fluxion.fmea_items OWNER TO postgres;

--
-- Name: COLUMN fmea_items.status; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.fmea_items.status IS 'Estado operativo del item durante la evaluación manual: pending, evaluated o skipped.';


--
-- Name: COLUMN fmea_items.requires_second_review; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.fmea_items.requires_second_review IS 'Se activa cuando el evaluador reduce el prior en 3 o más puntos y exige segunda revisión antes de aprobar.';


--
-- Name: gap_dispositions; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.gap_dispositions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    gap_key text NOT NULL,
    gap_layer text NOT NULL,
    gap_source_id uuid NOT NULL,
    disposition text NOT NULL,
    rationale text NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gap_dispositions_disposition_check CHECK ((disposition = ANY (ARRAY['accepted'::text, 'not_applicable'::text]))),
    CONSTRAINT gap_dispositions_gap_layer_check CHECK ((gap_layer = ANY (ARRAY['normativo'::text, 'fmea'::text, 'control'::text, 'caducidad'::text]))),
    CONSTRAINT gap_dispositions_rationale_check CHECK ((length(TRIM(BOTH FROM rationale)) >= 10))
);


ALTER TABLE fluxion.gap_dispositions OWNER TO postgres;

--
-- Name: gaps; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.gaps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid,
    requirement_id uuid NOT NULL,
    status fluxion.gap_status DEFAULT 'auto_detected'::fluxion.gap_status NOT NULL,
    justification text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.gaps OWNER TO postgres;

--
-- Name: invitations; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text NOT NULL,
    role fluxion.org_role NOT NULL,
    system_ids uuid[] DEFAULT '{}'::uuid[],
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    status fluxion.invitation_status DEFAULT 'pending'::fluxion.invitation_status NOT NULL,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    accepted_at timestamp with time zone,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_resent_at timestamp with time zone,
    resend_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE fluxion.invitations OWNER TO postgres;

--
-- Name: COLUMN invitations.last_resent_at; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.invitations.last_resent_at IS 'Timestamp del último reenvío de la invitación';


--
-- Name: COLUMN invitations.resend_count; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.invitations.resend_count IS 'Número de veces que se ha reenviado la invitación';


--
-- Name: member_role_changes; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.member_role_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    member_id uuid NOT NULL,
    change_type text NOT NULL,
    prev_role text,
    new_role text,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_role_changes_change_type_check CHECK ((change_type = ANY (ARRAY['role_change'::text, 'deactivated'::text, 'reactivated'::text, 'removed'::text])))
);


ALTER TABLE fluxion.member_role_changes OWNER TO postgres;

--
-- Name: TABLE member_role_changes; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.member_role_changes IS 'Auditoría de cambios de rol, desactivaciones y reactivaciones de miembros';


--
-- Name: COLUMN member_role_changes.change_type; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.member_role_changes.change_type IS 'role_change | deactivated | reactivated | removed';


--
-- Name: notifications; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link_url text,
    related_task_id uuid,
    metadata jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.notifications OWNER TO postgres;

--
-- Name: TABLE notifications; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.notifications IS 'Notificaciones in-app para miembros del workspace. Genérica: type distingue el módulo origen. Solo service_role puede insertar — los clientes solo leen y marcan como leídas.';


--
-- Name: organization_soa_controls; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.organization_soa_controls (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    control_code text NOT NULL,
    is_applicable boolean DEFAULT false,
    justification text,
    status text DEFAULT 'not_started'::text,
    owner_user_id uuid,
    validation_evidence_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.organization_soa_controls OWNER TO postgres;

--
-- Name: organization_soa_metadata; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.organization_soa_metadata (
    organization_id uuid NOT NULL,
    version text DEFAULT '1.0'::text,
    owner_name text,
    approved_by text,
    scope text,
    updated_at timestamp with time zone DEFAULT now(),
    approved_at date,
    approved_by_role text,
    next_review_date date,
    scope_system_tags text[] DEFAULT '{}'::text[],
    lifecycle_status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT organization_soa_metadata_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['draft'::text, 'under_review'::text, 'approved'::text])))
);


ALTER TABLE fluxion.organization_soa_metadata OWNER TO postgres;

--
-- Name: COLUMN organization_soa_metadata.lifecycle_status; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organization_soa_metadata.lifecycle_status IS 'Workflow state of the SoA document: draft (editable) → under_review (locked) → approved (immutable). Can be reset to draft via "Iniciar nueva revisión".';


--
-- Name: organization_soa_system_links; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.organization_soa_system_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    soa_control_id uuid NOT NULL,
    ai_system_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.organization_soa_system_links OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    sector text,
    size text,
    geography text[] DEFAULT '{}'::text[],
    active_modules text[] DEFAULT '{}'::text[],
    plan text DEFAULT 'starter'::text,
    plan_started_at timestamp with time zone,
    plan_expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    logo_url text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    country text DEFAULT 'Espana'::text,
    normative_modules text[] DEFAULT '{}'::text[],
    apetito_riesgo text DEFAULT 'moderado'::text,
    iso_42001_status text,
    iso_42001_cert_date date,
    iso_42001_cert_body text,
    ai_inventory_status text,
    compliance_maturity integer,
    legal_name text,
    tax_id text,
    vat_number text,
    lei_code text,
    website text,
    description text,
    registered_address jsonb,
    parent_org_id uuid,
    dpo_name text,
    dpo_email text,
    dpo_phone text,
    external_auditor_name text,
    external_auditor_contact text,
    external_auditor_cert text,
    evidence_retention_months integer DEFAULT 84 NOT NULL,
    audit_log_retention_months integer DEFAULT 36 NOT NULL,
    personal_data_retention_months integer DEFAULT 60 NOT NULL,
    kanban_wip_limits jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT chk_iso_42001_cert_date CHECK (((iso_42001_cert_date IS NULL) OR (iso_42001_status = 'certified'::text))),
    CONSTRAINT organizations_ai_inventory_status_check CHECK ((ai_inventory_status = ANY (ARRAY['complete'::text, 'partial'::text, 'none'::text]))),
    CONSTRAINT organizations_compliance_maturity_check CHECK ((compliance_maturity = ANY (ARRAY[0, 25, 50, 75]))),
    CONSTRAINT organizations_iso_42001_status_check CHECK ((iso_42001_status = ANY (ARRAY['certified'::text, 'in_progress'::text, 'none'::text])))
);


ALTER TABLE fluxion.organizations OWNER TO postgres;

--
-- Name: COLUMN organizations.legal_name; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.legal_name IS 'Razón social oficial (denominación registral)';


--
-- Name: COLUMN organizations.tax_id; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.tax_id IS 'CIF / NIF / número de identificación fiscal';


--
-- Name: COLUMN organizations.vat_number; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.vat_number IS 'Número de IVA intracomunitario (ej. ES-B12345678)';


--
-- Name: COLUMN organizations.lei_code; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.lei_code IS 'Legal Entity Identifier (20 caracteres ISO 17442)';


--
-- Name: COLUMN organizations.website; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.website IS 'URL del sitio web corporativo';


--
-- Name: COLUMN organizations.description; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.description IS 'Descripción pública de la entidad';


--
-- Name: COLUMN organizations.registered_address; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.registered_address IS 'Domicilio fiscal: {street, city, postal_code, country}';


--
-- Name: COLUMN organizations.parent_org_id; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.parent_org_id IS 'Organización matriz o holding (autorreferencia)';


--
-- Name: COLUMN organizations.dpo_name; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.dpo_name IS 'Nombre del Delegado de Protección de Datos (DPO)';


--
-- Name: COLUMN organizations.dpo_email; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.dpo_email IS 'Email de contacto del DPO';


--
-- Name: COLUMN organizations.dpo_phone; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.dpo_phone IS 'Teléfono del DPO';


--
-- Name: COLUMN organizations.external_auditor_name; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.external_auditor_name IS 'Nombre del auditor externo designado';


--
-- Name: COLUMN organizations.external_auditor_contact; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.external_auditor_contact IS 'Email o teléfono de contacto del auditor externo';


--
-- Name: COLUMN organizations.external_auditor_cert; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.external_auditor_cert IS 'Certificación o acreditación del auditor (ej. ISO 27001 Lead Auditor)';


--
-- Name: COLUMN organizations.evidence_retention_months; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.evidence_retention_months IS 'Meses de retención de documentos de evidencia (defecto: 84 = 7 años)';


--
-- Name: COLUMN organizations.audit_log_retention_months; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.audit_log_retention_months IS 'Meses de retención de logs de auditoría (defecto: 36 = 3 años)';


--
-- Name: COLUMN organizations.personal_data_retention_months; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.personal_data_retention_months IS 'Meses de retención de datos personales procesados por sistemas IA (defecto: 60 = 5 años)';


--
-- Name: COLUMN organizations.kanban_wip_limits; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.organizations.kanban_wip_limits IS 'WIP limits per Kanban column. Keys = TaskStatus values. 0 or missing = no limit.';


--
-- Name: treatment_plans; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid NOT NULL,
    evaluation_id uuid NOT NULL,
    code text NOT NULL,
    status fluxion.treatment_plan_status DEFAULT 'draft'::fluxion.treatment_plan_status NOT NULL,
    zone_at_creation text NOT NULL,
    zone_target text,
    ai_act_floor text NOT NULL,
    s_max_at_creation smallint NOT NULL,
    modes_count_total smallint DEFAULT 0 NOT NULL,
    modes_count_zone_i smallint DEFAULT 0 NOT NULL,
    modes_count_zone_ii smallint DEFAULT 0 NOT NULL,
    actions_total smallint DEFAULT 0 NOT NULL,
    actions_completed smallint DEFAULT 0 NOT NULL,
    pivot_node_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    residual_risk_notes text,
    accepted_risk_count smallint DEFAULT 0 NOT NULL,
    approval_level fluxion.approval_level NOT NULL,
    approver_id uuid,
    approved_at timestamp with time zone,
    approval_minutes_ref text,
    approval_committee_notes text,
    deadline date NOT NULL,
    review_cadence text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_approval_coherence CHECK ((((approval_level = 'level_3'::fluxion.approval_level) AND ((status <> 'approved'::fluxion.treatment_plan_status) OR (approval_minutes_ref IS NOT NULL))) OR (approval_level = ANY (ARRAY['level_1'::fluxion.approval_level, 'level_2'::fluxion.approval_level])))),
    CONSTRAINT chk_s_max CHECK (((s_max_at_creation >= 1) AND (s_max_at_creation <= 9))),
    CONSTRAINT chk_zone_values CHECK (((zone_at_creation = ANY (ARRAY['zona_i'::text, 'zona_ii'::text, 'zona_iii'::text, 'zona_iv'::text])) AND (ai_act_floor = ANY (ARRAY['zona_i'::text, 'zona_ii'::text, 'zona_iii'::text, 'zona_iv'::text]))))
);


ALTER TABLE fluxion.treatment_plans OWNER TO postgres;

--
-- Name: TABLE treatment_plans; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_plans IS 'Cabecera del plan de tratamiento FMEA. Una por evaluación aprobada. Implementa las cuatro secciones del Cap. 23 de la metodología Fluxion: diagnóstico de partida, acciones priorizadas, riesgo residual asumido, aprobación.';


--
-- Name: COLUMN treatment_plans.zone_at_creation; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_plans.zone_at_creation IS 'Snapshot inmutable de la zona del sistema al crear el plan. No se actualiza aunque cambien los S_actual durante la ejecución del plan.';


--
-- Name: COLUMN treatment_plans.zone_target; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_plans.zone_target IS 'Zona proyectada si se completan todas las acciones con sus S_residual objetivo. Se recalcula cuando cambian los S_residual en treatment_actions. No puede ser inferior al ai_act_floor.';


--
-- Name: COLUMN treatment_plans.approval_level; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_plans.approval_level IS 'Determinado automáticamente por zone_at_creation. level_1: Zona III/IV → solo responsable SGAI. level_2: Zona II → SGAI + CRO. level_3: Zona I → alta dirección con firma en acta de comité.';


--
-- Name: plan_summary; Type: VIEW; Schema: fluxion; Owner: postgres
--

CREATE VIEW fluxion.plan_summary AS
 SELECT tp.id,
    tp.organization_id,
    tp.system_id,
    sys.name AS system_name,
    sys.internal_id AS system_code,
    tp.code AS plan_code,
    tp.status,
    tp.zone_at_creation,
    tp.zone_target,
    tp.ai_act_floor,
    tp.approval_level,
    tp.deadline,
    (tp.deadline < CURRENT_DATE) AS is_overdue,
    tp.actions_total,
    tp.actions_completed,
        CASE
            WHEN (tp.actions_total = 0) THEN (0)::numeric
            ELSE round((((tp.actions_completed)::numeric / (tp.actions_total)::numeric) * (100)::numeric))
        END AS completion_pct,
    tp.created_at,
    tp.updated_at
   FROM (fluxion.treatment_plans tp
     JOIN fluxion.ai_systems sys ON ((sys.id = tp.system_id)));


ALTER TABLE fluxion.plan_summary OWNER TO postgres;

--
-- Name: VIEW plan_summary; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON VIEW fluxion.plan_summary IS 'Vista de resumen de planes de tratamiento para el dashboard. Usa internal_id del sistema cuando existe.';


--
-- Name: profile_systems; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.profile_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    is_lead boolean DEFAULT true NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid
);


ALTER TABLE fluxion.profile_systems OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    full_name text NOT NULL,
    display_name text,
    avatar_url text,
    job_title text,
    department text,
    role fluxion.org_role DEFAULT 'viewer'::fluxion.org_role NOT NULL,
    platform_role fluxion.platform_role,
    is_active boolean DEFAULT true NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    copilot_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone,
    first_name text,
    last_name text,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    phone text,
    secondary_email text,
    manager_id uuid,
    bio text,
    pronouns text
);


ALTER TABLE fluxion.profiles OWNER TO postgres;

--
-- Name: COLUMN profiles.first_name; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.first_name IS 'Nombre. Combinado con last_name forma el nombre legal completo. Mantener sincronizado con full_name.';


--
-- Name: COLUMN profiles.last_name; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.last_name IS 'Apellidos. Mantener sincronizado con full_name.';


--
-- Name: COLUMN profiles.preferences; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.preferences IS 'Preferencias del usuario como jsonb (timezone, locale, date_format, week_starts_on, theme, notification_prefs, etc.).';


--
-- Name: COLUMN profiles.phone; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.phone IS 'Teléfono corporativo o móvil de contacto. Útil para owners ante incidentes regulatorios.';


--
-- Name: COLUMN profiles.secondary_email; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.secondary_email IS 'Email alternativo opcional para recibir notificaciones fuera de la cuenta principal.';


--
-- Name: COLUMN profiles.manager_id; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.manager_id IS 'Manager directo dentro de la organización. FK a fluxion.profiles(id), ON DELETE SET NULL.';


--
-- Name: COLUMN profiles.bio; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.bio IS 'Biografía corta (recomendado <= 280 caracteres). Visible en hovers de owner y firmas en exports.';


--
-- Name: COLUMN profiles.pronouns; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.profiles.pronouns IS 'Pronombres preferidos del usuario (ej. "ella", "él", "elle"). Opcional.';


--
-- Name: reevaluation_triggers; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.reevaluation_triggers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid,
    trigger_type fluxion.reevaluation_trigger_type NOT NULL,
    level_scope text,
    state text DEFAULT 'detectado'::text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.reevaluation_triggers OWNER TO postgres;

--
-- Name: soa_controls_log; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.soa_controls_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    soa_control_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    control_code text NOT NULL,
    is_applicable boolean,
    justification text,
    status text,
    notes text,
    validation_evidence_id uuid,
    linked_system_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.soa_controls_log OWNER TO postgres;

--
-- Name: TABLE soa_controls_log; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.soa_controls_log IS 'Log de auditoría que registra cada cambio realizado en los controles del SoA.';


--
-- Name: soa_lifecycle_log; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.soa_lifecycle_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    from_status text,
    to_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.soa_lifecycle_log OWNER TO postgres;

--
-- Name: system_evidence_versions; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_evidence_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_type text NOT NULL,
    title text NOT NULL,
    description text,
    evidence_type text NOT NULL,
    status text NOT NULL,
    external_url text,
    version text,
    issued_at timestamp with time zone,
    expires_at timestamp with time zone,
    validation_notes text,
    CONSTRAINT system_evidence_versions_change_type_check CHECK ((change_type = ANY (ARRAY['edit'::text, 'review_requested'::text, 'approved'::text, 'rejected'::text, 'reopened'::text, 'created'::text])))
);


ALTER TABLE fluxion.system_evidence_versions OWNER TO postgres;

--
-- Name: system_evidences; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_evidences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    evidence_type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    storage_path text,
    external_url text,
    version text,
    mime_type text,
    file_size_bytes bigint,
    owner_user_id uuid,
    reviewed_by uuid,
    issued_at date,
    expires_at date,
    reviewed_at timestamp with time zone,
    validation_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scope text DEFAULT 'system'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT chk_system_evidences_location CHECK (((storage_path IS NOT NULL) OR (external_url IS NOT NULL))),
    CONSTRAINT chk_system_evidences_scope_enum CHECK ((scope = ANY (ARRAY['system'::text, 'organization'::text]))),
    CONSTRAINT chk_system_evidences_scope_system_id CHECK ((((scope = 'system'::text) AND (ai_system_id IS NOT NULL)) OR ((scope = 'organization'::text) AND (ai_system_id IS NULL)))),
    CONSTRAINT chk_system_evidences_status CHECK ((status = ANY (ARRAY['draft'::text, 'valid'::text, 'expired'::text, 'pending_review'::text, 'rejected'::text])))
);


ALTER TABLE fluxion.system_evidences OWNER TO postgres;

--
-- Name: TABLE system_evidences; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.system_evidences IS 'Metadatos de evidencias documentales y operativas vinculadas a un sistema de IA.';


--
-- Name: COLUMN system_evidences.storage_path; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_evidences.storage_path IS 'Ruta del archivo en Supabase Storage cuando la evidencia se sube a la plataforma.';


--
-- Name: COLUMN system_evidences.external_url; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_evidences.external_url IS 'Enlace externo alternativo cuando la evidencia se referencia fuera de la plataforma.';


--
-- Name: system_failure_mode_evidences; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_failure_mode_evidences (
    system_failure_mode_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_by uuid
);


ALTER TABLE fluxion.system_failure_mode_evidences OWNER TO postgres;

--
-- Name: system_obligation_evidences; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_obligation_evidences (
    obligation_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_by uuid
);


ALTER TABLE fluxion.system_obligation_evidences OWNER TO postgres;

--
-- Name: TABLE system_obligation_evidences; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.system_obligation_evidences IS 'Tabla puente para vincular una o varias evidencias a una obligación concreta del sistema.';


--
-- Name: system_obligations; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_obligations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    source_framework text NOT NULL,
    obligation_code text,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    owner_user_id uuid,
    due_date date,
    notes text,
    resolution_notes text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    obligation_key text,
    obligation_label text,
    work_notes text,
    exclusion_justification text,
    classification_event_id uuid,
    archived_at timestamp with time zone,
    archive_note text,
    CONSTRAINT chk_system_obligations_priority CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT chk_system_obligations_status CHECK ((status = ANY (ARRAY['suggested'::text, 'pending'::text, 'in_progress'::text, 'resolved'::text, 'blocked'::text, 'excluded'::text])))
);


ALTER TABLE fluxion.system_obligations OWNER TO postgres;

--
-- Name: TABLE system_obligations; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.system_obligations IS 'Obligaciones concretas aplicables a un sistema de IA y su estado operativo de cumplimiento.';


--
-- Name: COLUMN system_obligations.source_framework; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_obligations.source_framework IS 'Marco normativo de origen: AI Act, ISO 42001, RGPD, DORA, ENS, MDR/IVDR, etc.';


--
-- Name: COLUMN system_obligations.obligation_code; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_obligations.obligation_code IS 'Código del artículo, cláusula o control que identifica la obligación.';


--
-- Name: system_report_snapshots; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.system_report_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_system_id uuid,
    organization_id uuid NOT NULL,
    report_type text NOT NULL,
    title text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.system_report_snapshots OWNER TO postgres;

--
-- Name: TABLE system_report_snapshots; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.system_report_snapshots IS 'Snapshots persistidos de informes generados por sistema o a nivel organizacional.';


--
-- Name: COLUMN system_report_snapshots.ai_system_id; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_report_snapshots.ai_system_id IS 'Sistema asociado cuando el informe es por sistema; null cuando el snapshot es transversal a la organización.';


--
-- Name: COLUMN system_report_snapshots.report_type; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.system_report_snapshots.report_type IS 'Tipo de informe generado, por ejemplo gap_report, technical_dossier o gap_analysis.';


--
-- Name: task_activity_log; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    field text,
    old_value jsonb,
    new_value jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.task_activity_log OWNER TO postgres;

--
-- Name: TABLE task_activity_log; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.task_activity_log IS 'Timeline de actividad por tarea. Solo lectura desde el cliente; se inserta únicamente via service_role desde server actions.';


--
-- Name: task_attachments; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    uploader_id uuid,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    file_size bigint,
    mime_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE fluxion.task_attachments OWNER TO postgres;

--
-- Name: TABLE task_attachments; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.task_attachments IS 'Metadatos de adjuntos vinculados a una tarea. El archivo físico vive en Storage bucket task-attachments. Soft-delete: deleted_at != NULL, el archivo se puede purgar de Storage por separado.';


--
-- Name: COLUMN task_attachments.storage_path; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.task_attachments.storage_path IS 'Path completo dentro del bucket: {org_id}/{task_id}/{attachment_id}-{filename}';


--
-- Name: task_checklist_items; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_checklist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    label text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_by uuid,
    completed_at timestamp with time zone,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.task_checklist_items OWNER TO postgres;

--
-- Name: task_comments; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    author_id uuid,
    body text NOT NULL,
    mentions uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT task_comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 5000)))
);


ALTER TABLE fluxion.task_comments OWNER TO postgres;

--
-- Name: TABLE task_comments; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.task_comments IS 'Comentarios por tarea. Soft-delete: deleted_at != NULL oculta el cuerpo pero preserva el hilo.';


--
-- Name: COLUMN task_comments.mentions; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.task_comments.mentions IS 'Array de profiles.id mencionados con @usuario en el cuerpo del comentario.';


--
-- Name: task_gap_links; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_gap_links (
    task_id uuid NOT NULL,
    gap_key text NOT NULL,
    group_key text,
    gap_layer text NOT NULL,
    gap_source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.task_gap_links OWNER TO postgres;

--
-- Name: task_recurrence_runs; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_recurrence_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recurrence_id uuid NOT NULL,
    task_id uuid,
    scheduled_for date NOT NULL,
    triggered_by text DEFAULT 'cron'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_recurrence_runs_triggered_by_check CHECK ((triggered_by = ANY (ARRAY['cron'::text, 'manual'::text])))
);


ALTER TABLE fluxion.task_recurrence_runs OWNER TO postgres;

--
-- Name: task_recurrences; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_recurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    template_id uuid,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'medium'::text NOT NULL,
    system_id uuid,
    assignee_id uuid,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    frequency text NOT NULL,
    day_of_week integer,
    day_of_month integer,
    month_of_year integer,
    due_offset_days integer DEFAULT 7 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_recurrences_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31))),
    CONSTRAINT task_recurrences_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT task_recurrences_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'quarterly'::text, 'annually'::text]))),
    CONSTRAINT task_recurrences_month_of_year_check CHECK (((month_of_year >= 1) AND (month_of_year <= 12))),
    CONSTRAINT task_recurrences_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


ALTER TABLE fluxion.task_recurrences OWNER TO postgres;

--
-- Name: task_saved_views; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_saved_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    owner_id uuid,
    name text NOT NULL,
    scope text DEFAULT 'personal'::text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort jsonb DEFAULT '{}'::jsonb NOT NULL,
    "grouping" text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_saved_views_grouping_check CHECK (("grouping" = ANY (ARRAY['status'::text, 'priority'::text, 'assignee'::text, 'system'::text, 'due_date'::text]))),
    CONSTRAINT task_saved_views_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 80))),
    CONSTRAINT task_saved_views_scope_check CHECK ((scope = ANY (ARRAY['personal'::text, 'shared'::text])))
);


ALTER TABLE fluxion.task_saved_views OWNER TO postgres;

--
-- Name: task_templates; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    owner_id uuid,
    scope text DEFAULT 'personal'::text NOT NULL,
    name text NOT NULL,
    description text,
    default_priority text DEFAULT 'medium'::text NOT NULL,
    default_tags text[] DEFAULT '{}'::text[] NOT NULL,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_templates_default_priority_check CHECK ((default_priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT task_templates_org_required CHECK (((scope = 'system'::text) OR (organization_id IS NOT NULL))),
    CONSTRAINT task_templates_scope_check CHECK ((scope = ANY (ARRAY['personal'::text, 'shared'::text, 'system'::text]))),
    CONSTRAINT task_templates_system_no_owner CHECK (((scope <> 'system'::text) OR ((organization_id IS NULL) AND (owner_id IS NULL))))
);


ALTER TABLE fluxion.task_templates OWNER TO postgres;

--
-- Name: task_watchers; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.task_watchers (
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_watchers_source_check CHECK ((source = ANY (ARRAY['auto'::text, 'manual'::text])))
);


ALTER TABLE fluxion.task_watchers OWNER TO postgres;

--
-- Name: TABLE task_watchers; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.task_watchers IS 'Seguidores de una tarea. source=auto: creador/asignado añadido automáticamente. source=manual: el usuario optó por seguir la tarea.';


--
-- Name: tasks; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    system_id uuid,
    title text NOT NULL,
    description text,
    status fluxion.task_status DEFAULT 'todo'::fluxion.task_status NOT NULL,
    priority fluxion.task_priority DEFAULT 'medium'::fluxion.task_priority NOT NULL,
    source_type text DEFAULT 'manual'::text NOT NULL,
    source_id uuid,
    assignee_id uuid,
    created_by uuid,
    due_date date,
    completed_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" bigint,
    CONSTRAINT tasks_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'treatment_action'::text, 'gap'::text, 'evaluation'::text, 'fmea_item'::text, 'gap_group'::text]))),
    CONSTRAINT tasks_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 300)))
);


ALTER TABLE fluxion.tasks OWNER TO postgres;

--
-- Name: TABLE tasks; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.tasks IS 'Work items unificados para el módulo de Ejecución (Tareas + Kanban). Las tareas pueden originarse de forma manual o ser generadas automáticamente desde treatment_actions, gaps o evaluaciones.';


--
-- Name: COLUMN tasks.source_type; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.tasks.source_type IS 'Indica el módulo que originó la tarea. manual = creada directamente por el usuario.';


--
-- Name: COLUMN tasks.source_id; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.tasks.source_id IS 'UUID del registro origen (treatment_actions.id, gaps.id, fmea_evaluations.id). NULL para tareas manuales.';


--
-- Name: treatment_action_events; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_action_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    action_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    event_type text NOT NULL,
    actor_user_id uuid,
    actor_name text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    before_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    after_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    justification text,
    CONSTRAINT treatment_action_events_event_type_check CHECK ((event_type = ANY (ARRAY['option_selected'::text, 'owner_changed'::text, 'duedate_changed'::text, 'residual_target_changed'::text, 'residual_achieved_recorded'::text, 'slippage_accepted'::text, 'task_status_changed'::text, 'closed'::text])))
);


ALTER TABLE fluxion.treatment_action_events OWNER TO postgres;

--
-- Name: TABLE treatment_action_events; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_action_events IS 'Registro append-only de decisiones sobre acciones de tratamiento. Captura quién cambió qué, cuándo y con qué justificación. Append-only: sin policies de UPDATE/DELETE.';


--
-- Name: COLUMN treatment_action_events.event_type; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_action_events.event_type IS 'Tipo de decisión: selección de opción, cambio de owner/due_date, registro de residual, aceptación de slippage, etc.';


--
-- Name: treatment_action_reviews; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_action_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    decision text NOT NULL,
    new_review_due_date date,
    justification text NOT NULL,
    CONSTRAINT treatment_action_reviews_decision_check CHECK ((decision = ANY (ARRAY['reaffirmed'::text, 'changed_to_mitigate'::text, 'changed_to_transfer'::text, 'changed_to_avoid'::text, 'escalated'::text])))
);


ALTER TABLE fluxion.treatment_action_reviews OWNER TO postgres;

--
-- Name: TABLE treatment_action_reviews; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_action_reviews IS 'Registro de revisiones periódicas de acciones aceptadas o diferidas. Cada fila documenta la decisión tomada al vencer review_due_date.';


--
-- Name: COLUMN treatment_action_reviews.decision; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_action_reviews.decision IS 'reaffirmed: se mantiene la aceptación/diferimiento con nueva fecha. changed_to_*: se cambia la opción de tratamiento. escalated: se eleva al comité de alta dirección.';


--
-- Name: treatment_actions; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    fmea_item_id uuid NOT NULL,
    option fluxion.treatment_option,
    status fluxion.treatment_action_status DEFAULT 'pending'::fluxion.treatment_action_status NOT NULL,
    s_actual_at_creation smallint NOT NULL,
    s_residual_target smallint,
    s_residual_achieved smallint,
    control_id uuid,
    justification text,
    evidence_description text,
    owner_id uuid,
    due_date date,
    completed_at timestamp with time zone,
    evidence_id uuid,
    acceptance_approved_by uuid,
    acceptance_approved_at timestamp with time zone,
    review_due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    task_id uuid,
    last_reviewed_at timestamp with time zone,
    review_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_aceptar_not_zona_i CHECK (((option IS NULL) OR (NOT ((option = 'aceptar'::fluxion.treatment_option) AND (s_actual_at_creation = 9))))),
    CONSTRAINT chk_aceptar_requires_justification CHECK (((option IS NULL) OR (option <> 'aceptar'::fluxion.treatment_option) OR ((justification IS NOT NULL) AND (length(justification) >= 100)))),
    CONSTRAINT chk_control_coherence CHECK (((option = 'mitigar'::fluxion.treatment_option) OR (control_id IS NULL))),
    CONSTRAINT chk_s_actual_range CHECK (((s_actual_at_creation >= 1) AND (s_actual_at_creation <= 9))),
    CONSTRAINT chk_s_residual_valid CHECK (((option IS NULL) OR (option <> 'mitigar'::fluxion.treatment_option) OR ((s_residual_target IS NOT NULL) AND (s_residual_target >= 1) AND (s_residual_target < s_actual_at_creation)))),
    CONSTRAINT chk_ta_option_required_outside_pending CHECK (((status = 'pending'::fluxion.treatment_action_status) OR (option IS NOT NULL)))
);


ALTER TABLE fluxion.treatment_actions OWNER TO postgres;

--
-- Name: TABLE treatment_actions; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_actions IS 'Decisión de tratamiento por modo de fallo. Una acción por modo en el plan. Solo option=mitigar genera un control en fluxion.controls. Las demás opciones se cierran con justificación + evidencia directa.';


--
-- Name: COLUMN treatment_actions.option; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_actions.option IS 'Puede ser NULL mientras la acción está pendiente de decisión. Una vez definida, toma una de las cinco opciones de tratamiento.';


--
-- Name: COLUMN treatment_actions.s_residual_target; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_actions.s_residual_target IS 'S_actual objetivo tras implementar el control. Solo para option=mitigar. Visible en el plan como proyección hasta que la evidencia se verifica. NUNCA actualiza fmea_items.s_actual directamente — solo lo hace la verificación de evidencia a través del módulo de evidencias.';


--
-- Name: COLUMN treatment_actions.s_residual_achieved; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_actions.s_residual_achieved IS 'S_actual real tras verificar la evidencia. Lo actualiza el sistema automáticamente cuando evidence_id tiene status=verified. Puede diferir de s_residual_target si el control fue parcialmente efectivo.';


--
-- Name: COLUMN treatment_actions.control_id; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_actions.control_id IS 'FK a fluxion.controls. Puede ser un control ya existente (creado por el motor de obligaciones en compliance) o uno nuevo creado para esta acción. La misma evidencia puede cerrar tanto esta acción como el gap de compliance.';


--
-- Name: COLUMN treatment_actions.last_reviewed_at; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_actions.last_reviewed_at IS 'Timestamp de la última revisión periódica. NULL si nunca se ha revisado.';


--
-- Name: COLUMN treatment_actions.review_count; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_actions.review_count IS 'Número de revisiones periódicas realizadas sobre esta acción.';


--
-- Name: treatment_actions_legacy_20260417; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_actions_legacy_20260417 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_plan_id uuid NOT NULL,
    fmea_item_id uuid NOT NULL,
    action_type fluxion.treatment_action_type NOT NULL,
    target_s_residual integer NOT NULL,
    owner_id uuid,
    deadline date,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.treatment_actions_legacy_20260417 OWNER TO postgres;

--
-- Name: TABLE treatment_actions_legacy_20260417; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_actions_legacy_20260417 IS 'Backup automático del esquema legacy de treatment_actions previo a 021_treatment_schema.';


--
-- Name: treatment_actions_pending_review; Type: VIEW; Schema: fluxion; Owner: postgres
--

CREATE VIEW fluxion.treatment_actions_pending_review AS
 SELECT ta.id,
    ta.organization_id,
    ta.plan_id,
    ta.fmea_item_id,
    ta.option,
    ta.status,
    ta.s_actual_at_creation,
    ta.s_residual_target,
    ta.s_residual_achieved,
    ta.control_id,
    ta.justification,
    ta.evidence_description,
    ta.owner_id,
    ta.due_date,
    ta.completed_at,
    ta.evidence_id,
    ta.acceptance_approved_by,
    ta.acceptance_approved_at,
    ta.review_due_date,
    ta.created_at,
    ta.updated_at,
    ta.task_id,
    ta.last_reviewed_at,
    ta.review_count,
    (CURRENT_DATE - ta.review_due_date) AS days_overdue,
        CASE
            WHEN (ta.review_due_date < CURRENT_DATE) THEN 'overdue'::text
            WHEN (ta.review_due_date = CURRENT_DATE) THEN 'due_today'::text
            ELSE 'upcoming'::text
        END AS review_urgency
   FROM fluxion.treatment_actions ta
  WHERE ((ta.option = ANY (ARRAY['aceptar'::fluxion.treatment_option, 'diferir'::fluxion.treatment_option])) AND (ta.review_due_date IS NOT NULL) AND (ta.review_due_date <= (CURRENT_DATE + '30 days'::interval)) AND (ta.status <> ALL (ARRAY['cancelled'::fluxion.treatment_action_status, 'completed'::fluxion.treatment_action_status])));


ALTER TABLE fluxion.treatment_actions_pending_review OWNER TO postgres;

--
-- Name: VIEW treatment_actions_pending_review; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON VIEW fluxion.treatment_actions_pending_review IS 'Acciones aceptadas o diferidas cuya review_due_date vence en los próximos 30 días o ya ha vencido, con estado activo.';


--
-- Name: treatment_plan_snapshots; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_plan_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    trigger text NOT NULL,
    actor_user_id uuid,
    actor_name text,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_state jsonb NOT NULL,
    actions_state jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT treatment_plan_snapshots_trigger_check CHECK ((trigger = ANY (ARRAY['submitted_for_review'::text, 'approved'::text, 'rejected'::text, 'started'::text, 'closed'::text, 'superseded'::text])))
);


ALTER TABLE fluxion.treatment_plan_snapshots OWNER TO postgres;

--
-- Name: TABLE treatment_plan_snapshots; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_plan_snapshots IS 'Snapshots inmutables del plan de tratamiento en cada transición de estado. Append-only: las policies sólo permiten SELECT e INSERT. Soporta auditoría AI Act Art. 12 / ISO 42001 cl. 7.5.';


--
-- Name: COLUMN treatment_plan_snapshots.trigger; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_plan_snapshots.trigger IS 'Transición que disparó la captura del snapshot.';


--
-- Name: COLUMN treatment_plan_snapshots.plan_state; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_plan_snapshots.plan_state IS 'Snapshot completo de la fila treatment_plans en el momento de la captura.';


--
-- Name: COLUMN treatment_plan_snapshots.actions_state; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON COLUMN fluxion.treatment_plan_snapshots.actions_state IS 'Snapshot de todas las treatment_actions asociadas al plan.';


--
-- Name: treatment_plans_legacy_20260417; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.treatment_plans_legacy_20260417 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id uuid NOT NULL,
    approver_id uuid,
    approved_at timestamp with time zone,
    max_implementation_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE fluxion.treatment_plans_legacy_20260417 OWNER TO postgres;

--
-- Name: TABLE treatment_plans_legacy_20260417; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.treatment_plans_legacy_20260417 IS 'Backup automático del esquema legacy de treatment_plans previo a 021_treatment_schema.';


--
-- Name: webhooks; Type: TABLE; Schema: fluxion; Owner: postgres
--

CREATE TABLE fluxion.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret text NOT NULL,
    events text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    last_triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE fluxion.webhooks OWNER TO postgres;

--
-- Name: TABLE webhooks; Type: COMMENT; Schema: fluxion; Owner: postgres
--

COMMENT ON TABLE fluxion.webhooks IS 'Endpoints de notificación push. El secreto HMAC se usa para firmar el payload (X-Fluxion-Signature).';


--
-- Name: chunks; Type: TABLE; Schema: rag; Owner: postgres
--

CREATE TABLE rag.chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    source_type rag.source_type NOT NULL,
    chunk_type rag.chunk_type NOT NULL,
    chunk_index integer NOT NULL,
    section_ref text,
    parent_section text,
    content text NOT NULL,
    content_tokens integer NOT NULL,
    summary text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    embedding public.vector(1024),
    short_name text,
    language text DEFAULT 'es'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rag.chunks OWNER TO postgres;

--
-- Name: TABLE chunks; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON TABLE rag.chunks IS 'Fragmentos del corpus RAG con embeddings voyage-law-2 (1024 dims). source_type + short_name desnormalizados permiten filtrar por tipo de documento Y por reglamento específico sin JOIN a rag.documents. Ejemplo: source_type=eu_regulation AND short_name=''AI Act''. metadata JSONB permite filtros ricos sin columnas adicionales. organization_id NULL = corpus plataforma. NOT NULL = tenant privado.';


--
-- Name: COLUMN chunks.content_tokens; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON COLUMN rag.chunks.content_tokens IS 'Tokens estimados con tokenizador voyage-law-2. Ventana de chunking: 400-800 tokens con overlap ~100 tokens.';


--
-- Name: COLUMN chunks.summary; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON COLUMN rag.chunks.summary IS 'Resumen generado en ingesta para incluir en el prompt del agente como contexto adicional cuando el chunk completo no cabe.';


--
-- Name: COLUMN chunks.short_name; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON COLUMN rag.chunks.short_name IS 'Nombre corto del documento origen, desnormalizado desde rag.documents. Permite filtrar por reglamento específico dentro del mismo source_type sin JOIN. Valores: ''AI Act'', ''RGPD'', ''DORA'', ''ISO 42001'', etc. Se rellena automáticamente en la ingesta desde documents.short_name.';


--
-- Name: COLUMN chunks.language; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON COLUMN rag.chunks.language IS 'Idioma del contenido del chunk. Determina qué índice full-text usar en búsqueda híbrida: ''es'' → tsvector(''spanish''), ''en'' → tsvector(''english'').';


--
-- Name: documents; Type: TABLE; Schema: rag; Owner: postgres
--

CREATE TABLE rag.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type rag.source_type NOT NULL,
    title text NOT NULL,
    short_name text NOT NULL,
    language text DEFAULT 'es'::text NOT NULL,
    version text,
    url text,
    jurisdiction text DEFAULT 'EU'::text NOT NULL,
    total_chunks integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    last_ingested_at timestamp with time zone,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rag.documents OWNER TO postgres;

--
-- Name: TABLE documents; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON TABLE rag.documents IS 'Registro de documentos fuente del corpus RAG. organization_id NULL = corpus plataforma (AI Act, ISO, guías). organization_id NOT NULL = documentación privada del tenant.';


--
-- Name: COLUMN documents.checksum; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON COLUMN rag.documents.checksum IS 'SHA256 del HTML/texto fuente. Si cambia en una re-ingesta, se invalidan los chunks existentes y se re-indexa el documento.';


--
-- Name: corpus_status; Type: VIEW; Schema: rag; Owner: postgres
--

CREATE VIEW rag.corpus_status AS
 SELECT d.source_type,
    d.short_name,
    d.language,
    d.version,
    d.total_chunks,
    d.total_tokens,
    d.last_ingested_at,
    count(c.id) FILTER (WHERE c.is_active) AS active_chunks,
    count(c.id) FILTER (WHERE (NOT c.is_active)) AS inactive_chunks,
    max(c.created_at) AS last_chunk_at,
        CASE
            WHEN (d.last_ingested_at < (now() - '90 days'::interval)) THEN true
            ELSE false
        END AS needs_refresh
   FROM (rag.documents d
     LEFT JOIN rag.chunks c ON ((c.document_id = d.id)))
  GROUP BY d.id, d.source_type, d.short_name, d.language, d.version, d.total_chunks, d.total_tokens, d.last_ingested_at
  ORDER BY d.source_type, d.short_name;


ALTER TABLE rag.corpus_status OWNER TO postgres;

--
-- Name: VIEW corpus_status; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON VIEW rag.corpus_status IS 'Estado del corpus RAG para el panel de administración. needs_refresh=true cuando la ingesta tiene más de 90 días o el checksum del documento fuente ha cambiado.';


--
-- Name: ingestion_jobs; Type: TABLE; Schema: rag; Owner: postgres
--

CREATE TABLE rag.ingestion_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    trigger text NOT NULL,
    chunks_created integer DEFAULT 0 NOT NULL,
    chunks_updated integer DEFAULT 0 NOT NULL,
    chunks_deleted integer DEFAULT 0 NOT NULL,
    tokens_processed integer DEFAULT 0 NOT NULL,
    embedding_cost_usd numeric(10,6),
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rag.ingestion_jobs OWNER TO postgres;

--
-- Name: TABLE ingestion_jobs; Type: COMMENT; Schema: rag; Owner: postgres
--

COMMENT ON TABLE rag.ingestion_jobs IS 'Trazabilidad de ingestas: qué se indexó, cuándo, cuánto costó. Permite auditar el corpus y detectar documentos desactualizados.';


--
-- Name: organization_chunks; Type: TABLE; Schema: rag; Owner: postgres
--

CREATE TABLE rag.organization_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    source_type rag.source_type NOT NULL,
    chunk_type rag.chunk_type NOT NULL,
    chunk_index integer NOT NULL,
    section_ref text,
    parent_section text,
    content text NOT NULL,
    content_tokens integer NOT NULL,
    summary text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    embedding public.vector(1536),
    short_name text,
    language text DEFAULT 'es'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rag.organization_chunks OWNER TO postgres;

--
-- Name: organization_documents; Type: TABLE; Schema: rag; Owner: postgres
--

CREATE TABLE rag.organization_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    source_type rag.source_type NOT NULL,
    title text NOT NULL,
    short_name text NOT NULL,
    language text DEFAULT 'es'::text NOT NULL,
    version text,
    url text,
    total_chunks integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    last_ingested_at timestamp with time zone,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rag.organization_documents OWNER TO postgres;

--
-- Name: org_corpus_status; Type: VIEW; Schema: rag; Owner: postgres
--

CREATE VIEW rag.org_corpus_status AS
 SELECT d.organization_id,
    d.source_type,
    d.short_name,
    d.language,
    d.version,
    d.total_chunks,
    d.total_tokens,
    d.last_ingested_at,
    count(c.id) FILTER (WHERE c.is_active) AS active_chunks,
    count(c.id) FILTER (WHERE (NOT c.is_active)) AS inactive_chunks,
    max(c.created_at) AS last_chunk_at,
        CASE
            WHEN (d.last_ingested_at < (now() - '90 days'::interval)) THEN true
            ELSE false
        END AS needs_refresh
   FROM (rag.organization_documents d
     LEFT JOIN rag.organization_chunks c ON ((c.document_id = d.id)))
  GROUP BY d.id, d.organization_id, d.source_type, d.short_name, d.language, d.version, d.total_chunks, d.total_tokens, d.last_ingested_at
  ORDER BY d.organization_id, d.source_type, d.short_name;


ALTER TABLE rag.org_corpus_status OWNER TO postgres;

--
-- Name: org_ingestion_jobs; Type: TABLE; Schema: rag; Owner: postgres
--

CREATE TABLE rag.org_ingestion_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    trigger text NOT NULL,
    chunks_created integer DEFAULT 0 NOT NULL,
    chunks_updated integer DEFAULT 0 NOT NULL,
    chunks_deleted integer DEFAULT 0 NOT NULL,
    tokens_processed integer DEFAULT 0 NOT NULL,
    embedding_cost_usd numeric(10,6),
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rag.org_ingestion_jobs OWNER TO postgres;

--
-- Name: causal_families causal_families_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_families
    ADD CONSTRAINT causal_families_pkey PRIMARY KEY (id);


--
-- Name: causal_node_failure_mode_links causal_node_failure_mode_links_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_node_failure_mode_links
    ADD CONSTRAINT causal_node_failure_mode_links_pkey PRIMARY KEY (causal_node_id, failure_mode_id);


--
-- Name: causal_nodes causal_nodes_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_nodes
    ADD CONSTRAINT causal_nodes_pkey PRIMARY KEY (id);


--
-- Name: causal_relationships causal_relationships_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_relationships
    ADD CONSTRAINT causal_relationships_pkey PRIMARY KEY (id);


--
-- Name: control_templates control_templates_code_key; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.control_templates
    ADD CONSTRAINT control_templates_code_key UNIQUE (code);


--
-- Name: control_templates control_templates_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.control_templates
    ADD CONSTRAINT control_templates_pkey PRIMARY KEY (id);


--
-- Name: evidence_types evidence_types_code_key; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.evidence_types
    ADD CONSTRAINT evidence_types_code_key UNIQUE (code);


--
-- Name: evidence_types evidence_types_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.evidence_types
    ADD CONSTRAINT evidence_types_pkey PRIMARY KEY (id);


--
-- Name: failure_mode_causal_relations failure_mode_causal_relations_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_mode_causal_relations
    ADD CONSTRAINT failure_mode_causal_relations_pkey PRIMARY KEY (source_fm_id, target_fm_id);


--
-- Name: failure_mode_control_refs failure_mode_control_refs_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_mode_control_refs
    ADD CONSTRAINT failure_mode_control_refs_pkey PRIMARY KEY (failure_mode_id, control_template_id);


--
-- Name: failure_modes failure_modes_code_key; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_modes
    ADD CONSTRAINT failure_modes_code_key UNIQUE (code);


--
-- Name: failure_modes failure_modes_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_modes
    ADD CONSTRAINT failure_modes_pkey PRIMARY KEY (id);


--
-- Name: frameworks frameworks_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.frameworks
    ADD CONSTRAINT frameworks_pkey PRIMARY KEY (id);


--
-- Name: obligation_evidence_types obligation_evidence_types_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.obligation_evidence_types
    ADD CONSTRAINT obligation_evidence_types_pkey PRIMARY KEY (obligation_id, evidence_type_id);


--
-- Name: obligations obligations_code_key; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.obligations
    ADD CONSTRAINT obligations_code_key UNIQUE (code);


--
-- Name: obligations obligations_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.obligations
    ADD CONSTRAINT obligations_pkey PRIMARY KEY (id);


--
-- Name: requirement_control_mappings requirement_control_mappings_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.requirement_control_mappings
    ADD CONSTRAINT requirement_control_mappings_pkey PRIMARY KEY (requirement_id, control_template_id);


--
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- Name: risk_dimensions risk_dimensions_pkey; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.risk_dimensions
    ADD CONSTRAINT risk_dimensions_pkey PRIMARY KEY (id);


--
-- Name: causal_nodes uq_causal_node; Type: CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_nodes
    ADD CONSTRAINT uq_causal_node UNIQUE (name, domain);


--
-- Name: agent_messages agent_messages_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.agent_messages
    ADD CONSTRAINT agent_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_sessions agent_sessions_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.agent_sessions
    ADD CONSTRAINT agent_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_system_classification_reviews ai_system_classification_reviews_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_classification_reviews
    ADD CONSTRAINT ai_system_classification_reviews_pkey PRIMARY KEY (id);


--
-- Name: ai_system_history ai_system_history_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_history
    ADD CONSTRAINT ai_system_history_pkey PRIMARY KEY (id);


--
-- Name: ai_systems ai_systems_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_systems
    ADD CONSTRAINT ai_systems_pkey PRIMARY KEY (id);


--
-- Name: aisia_ai_generations aisia_ai_generations_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_ai_generations
    ADD CONSTRAINT aisia_ai_generations_pkey PRIMARY KEY (id);


--
-- Name: aisia_assessments aisia_assessments_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_pkey PRIMARY KEY (id);


--
-- Name: aisia_assessments aisia_assessments_system_version_unique; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_system_version_unique UNIQUE (ai_system_id, version);


--
-- Name: aisia_sections aisia_sections_assessment_code_unique; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_sections
    ADD CONSTRAINT aisia_sections_assessment_code_unique UNIQUE (assessment_id, section_code);


--
-- Name: aisia_sections aisia_sections_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_sections
    ADD CONSTRAINT aisia_sections_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: assistant_conversations assistant_conversations_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.assistant_conversations
    ADD CONSTRAINT assistant_conversations_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: causal_graph_instances causal_graph_instances_evaluation_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.causal_graph_instances
    ADD CONSTRAINT causal_graph_instances_evaluation_id_key UNIQUE (evaluation_id);


--
-- Name: causal_graph_instances causal_graph_instances_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.causal_graph_instances
    ADD CONSTRAINT causal_graph_instances_pkey PRIMARY KEY (id);


--
-- Name: classification_diffs classification_diffs_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_diffs
    ADD CONSTRAINT classification_diffs_pkey PRIMARY KEY (id);


--
-- Name: classification_events classification_events_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_events
    ADD CONSTRAINT classification_events_pkey PRIMARY KEY (id);


--
-- Name: committee_members committee_members_committee_id_profile_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_members
    ADD CONSTRAINT committee_members_committee_id_profile_id_key UNIQUE (committee_id, profile_id);


--
-- Name: committee_members committee_members_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_members
    ADD CONSTRAINT committee_members_pkey PRIMARY KEY (id);


--
-- Name: committee_sessions committee_sessions_committee_id_session_number_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_committee_id_session_number_key UNIQUE (committee_id, session_number);


--
-- Name: committee_sessions committee_sessions_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_pkey PRIMARY KEY (id);


--
-- Name: committees committees_organization_id_type_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committees
    ADD CONSTRAINT committees_organization_id_type_key UNIQUE (organization_id, type);


--
-- Name: committees committees_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committees
    ADD CONSTRAINT committees_pkey PRIMARY KEY (id);


--
-- Name: controls controls_organization_id_system_id_template_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.controls
    ADD CONSTRAINT controls_organization_id_system_id_template_id_key UNIQUE (organization_id, system_id, template_id);


--
-- Name: controls controls_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.controls
    ADD CONSTRAINT controls_pkey PRIMARY KEY (id);


--
-- Name: evidence_controls evidence_controls_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_controls
    ADD CONSTRAINT evidence_controls_pkey PRIMARY KEY (evidence_id, control_id);


--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_expiry_alerts
    ADD CONSTRAINT evidence_expiry_alerts_pkey PRIMARY KEY (id);


--
-- Name: evidences evidences_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidences
    ADD CONSTRAINT evidences_pkey PRIMARY KEY (id);


--
-- Name: fmea_evaluations fmea_evaluations_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_evaluations
    ADD CONSTRAINT fmea_evaluations_pkey PRIMARY KEY (id);


--
-- Name: fmea_item_history fmea_item_history_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_item_history
    ADD CONSTRAINT fmea_item_history_pkey PRIMARY KEY (id);


--
-- Name: fmea_items fmea_items_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_items
    ADD CONSTRAINT fmea_items_pkey PRIMARY KEY (id);


--
-- Name: gap_dispositions gap_dispositions_organization_id_gap_key_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gap_dispositions
    ADD CONSTRAINT gap_dispositions_organization_id_gap_key_key UNIQUE (organization_id, gap_key);


--
-- Name: gap_dispositions gap_dispositions_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gap_dispositions
    ADD CONSTRAINT gap_dispositions_pkey PRIMARY KEY (id);


--
-- Name: gaps gaps_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gaps
    ADD CONSTRAINT gaps_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_organization_id_email_status_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.invitations
    ADD CONSTRAINT invitations_organization_id_email_status_key UNIQUE (organization_id, email, status);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: member_role_changes member_role_changes_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.member_role_changes
    ADD CONSTRAINT member_role_changes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_soa_controls organization_soa_controls_organization_id_control_code_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_controls
    ADD CONSTRAINT organization_soa_controls_organization_id_control_code_key UNIQUE (organization_id, control_code);


--
-- Name: organization_soa_controls organization_soa_controls_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_controls
    ADD CONSTRAINT organization_soa_controls_pkey PRIMARY KEY (id);


--
-- Name: organization_soa_metadata organization_soa_metadata_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_metadata
    ADD CONSTRAINT organization_soa_metadata_pkey PRIMARY KEY (organization_id);


--
-- Name: organization_soa_system_links organization_soa_system_links_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_system_links
    ADD CONSTRAINT organization_soa_system_links_pkey PRIMARY KEY (id);


--
-- Name: organization_soa_system_links organization_soa_system_links_soa_control_id_ai_system_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_system_links
    ADD CONSTRAINT organization_soa_system_links_soa_control_id_ai_system_id_key UNIQUE (soa_control_id, ai_system_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: profile_systems profile_systems_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profile_systems
    ADD CONSTRAINT profile_systems_pkey PRIMARY KEY (id);


--
-- Name: profile_systems profile_systems_profile_id_ai_system_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profile_systems
    ADD CONSTRAINT profile_systems_profile_id_ai_system_id_key UNIQUE (profile_id, ai_system_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_organization_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profiles
    ADD CONSTRAINT profiles_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: reevaluation_triggers reevaluation_triggers_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.reevaluation_triggers
    ADD CONSTRAINT reevaluation_triggers_pkey PRIMARY KEY (id);


--
-- Name: soa_controls_log soa_controls_log_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_controls_log
    ADD CONSTRAINT soa_controls_log_pkey PRIMARY KEY (id);


--
-- Name: soa_lifecycle_log soa_lifecycle_log_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_lifecycle_log
    ADD CONSTRAINT soa_lifecycle_log_pkey PRIMARY KEY (id);


--
-- Name: system_evidence_versions system_evidence_versions_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidence_versions
    ADD CONSTRAINT system_evidence_versions_pkey PRIMARY KEY (id);


--
-- Name: system_evidences system_evidences_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidences
    ADD CONSTRAINT system_evidences_pkey PRIMARY KEY (id);


--
-- Name: system_failure_mode_evidences system_failure_mode_evidences_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_mode_evidences
    ADD CONSTRAINT system_failure_mode_evidences_pkey PRIMARY KEY (system_failure_mode_id, evidence_id);


--
-- Name: system_failure_modes system_failure_modes_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_modes
    ADD CONSTRAINT system_failure_modes_pkey PRIMARY KEY (id);


--
-- Name: system_obligation_evidences system_obligation_evidences_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligation_evidences
    ADD CONSTRAINT system_obligation_evidences_pkey PRIMARY KEY (obligation_id, evidence_id);


--
-- Name: system_obligations system_obligations_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligations
    ADD CONSTRAINT system_obligations_pkey PRIMARY KEY (id);


--
-- Name: system_report_snapshots system_report_snapshots_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_report_snapshots
    ADD CONSTRAINT system_report_snapshots_pkey PRIMARY KEY (id);


--
-- Name: task_activity_log task_activity_log_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_activity_log
    ADD CONSTRAINT task_activity_log_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_checklist_items task_checklist_items_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_checklist_items
    ADD CONSTRAINT task_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_gap_links task_gap_links_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_gap_links
    ADD CONSTRAINT task_gap_links_pkey PRIMARY KEY (task_id, gap_key);


--
-- Name: task_recurrence_runs task_recurrence_runs_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrence_runs
    ADD CONSTRAINT task_recurrence_runs_pkey PRIMARY KEY (id);


--
-- Name: task_recurrences task_recurrences_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrences
    ADD CONSTRAINT task_recurrences_pkey PRIMARY KEY (id);


--
-- Name: task_saved_views task_saved_views_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_saved_views
    ADD CONSTRAINT task_saved_views_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: task_watchers task_watchers_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_watchers
    ADD CONSTRAINT task_watchers_pkey PRIMARY KEY (task_id, user_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: treatment_action_events treatment_action_events_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_events
    ADD CONSTRAINT treatment_action_events_pkey PRIMARY KEY (id);


--
-- Name: treatment_action_reviews treatment_action_reviews_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_reviews
    ADD CONSTRAINT treatment_action_reviews_pkey PRIMARY KEY (id);


--
-- Name: treatment_actions_legacy_20260417 treatment_actions_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions_legacy_20260417
    ADD CONSTRAINT treatment_actions_pkey PRIMARY KEY (id);


--
-- Name: treatment_actions treatment_actions_pkey1; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_pkey1 PRIMARY KEY (id);


--
-- Name: treatment_actions treatment_actions_plan_id_fmea_item_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_plan_id_fmea_item_id_key UNIQUE (plan_id, fmea_item_id);


--
-- Name: treatment_plan_snapshots treatment_plan_snapshots_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plan_snapshots
    ADD CONSTRAINT treatment_plan_snapshots_pkey PRIMARY KEY (id);


--
-- Name: treatment_plans_legacy_20260417 treatment_plans_evaluation_id_key; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans_legacy_20260417
    ADD CONSTRAINT treatment_plans_evaluation_id_key UNIQUE (evaluation_id);


--
-- Name: treatment_plans treatment_plans_evaluation_id_key1; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans
    ADD CONSTRAINT treatment_plans_evaluation_id_key1 UNIQUE (evaluation_id);


--
-- Name: treatment_plans_legacy_20260417 treatment_plans_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans_legacy_20260417
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: treatment_plans treatment_plans_pkey1; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey1 PRIMARY KEY (id);


--
-- Name: evidence_expiry_alerts uq_evidence_expiry_alert; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_expiry_alerts
    ADD CONSTRAINT uq_evidence_expiry_alert UNIQUE (evidence_id, alert_type);


--
-- Name: system_failure_modes uq_system_failure_modes_unique; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_modes
    ADD CONSTRAINT uq_system_failure_modes_unique UNIQUE (ai_system_id, failure_mode_id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: chunks chunks_pkey; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.chunks
    ADD CONSTRAINT chunks_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: ingestion_jobs ingestion_jobs_pkey; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_pkey PRIMARY KEY (id);


--
-- Name: org_ingestion_jobs org_ingestion_jobs_pkey; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.org_ingestion_jobs
    ADD CONSTRAINT org_ingestion_jobs_pkey PRIMARY KEY (id);


--
-- Name: organization_chunks organization_chunks_document_id_chunk_index_key; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_chunks
    ADD CONSTRAINT organization_chunks_document_id_chunk_index_key UNIQUE (document_id, chunk_index);


--
-- Name: organization_chunks organization_chunks_pkey; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_chunks
    ADD CONSTRAINT organization_chunks_pkey PRIMARY KEY (id);


--
-- Name: organization_documents organization_documents_organization_id_title_version_key; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_documents
    ADD CONSTRAINT organization_documents_organization_id_title_version_key UNIQUE (organization_id, title, version);


--
-- Name: organization_documents organization_documents_pkey; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_documents
    ADD CONSTRAINT organization_documents_pkey PRIMARY KEY (id);


--
-- Name: chunks uq_chunk_position; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.chunks
    ADD CONSTRAINT uq_chunk_position UNIQUE (document_id, chunk_index);


--
-- Name: documents uq_doc_title_version; Type: CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.documents
    ADD CONSTRAINT uq_doc_title_version UNIQUE (title, version);


--
-- Name: idx_cnfml_conf; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_cnfml_conf ON compliance.causal_node_failure_mode_links USING btree (confidence);


--
-- Name: idx_cnfml_fm; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_cnfml_fm ON compliance.causal_node_failure_mode_links USING btree (failure_mode_id);


--
-- Name: idx_cnfml_node; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_cnfml_node ON compliance.causal_node_failure_mode_links USING btree (causal_node_id);


--
-- Name: idx_evidence_types_category; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_evidence_types_category ON compliance.evidence_types USING btree (category);


--
-- Name: idx_fmcr_control; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_fmcr_control ON compliance.failure_mode_control_refs USING btree (control_template_id);


--
-- Name: idx_fmcr_failure_mode; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_fmcr_failure_mode ON compliance.failure_mode_control_refs USING btree (failure_mode_id);


--
-- Name: idx_obligations_framework; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_obligations_framework ON compliance.obligations USING btree (framework);


--
-- Name: idx_obligations_scope; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_obligations_scope ON compliance.obligations USING btree (scope);


--
-- Name: idx_oet_evidence_type; Type: INDEX; Schema: compliance; Owner: postgres
--

CREATE INDEX idx_oet_evidence_type ON compliance.obligation_evidence_types USING btree (evidence_type_id);


--
-- Name: idx_agent_messages_session; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_agent_messages_session ON fluxion.agent_messages USING btree (session_id, message_index);


--
-- Name: idx_agent_sessions_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_agent_sessions_org ON fluxion.agent_sessions USING btree (organization_id, created_at DESC);


--
-- Name: idx_agent_sessions_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_agent_sessions_system ON fluxion.agent_sessions USING btree (system_id, agent_type, created_at DESC);


--
-- Name: idx_ai_system_history_event_type; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_system_history_event_type ON fluxion.ai_system_history USING btree (event_type);


--
-- Name: idx_ai_system_history_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_system_history_org ON fluxion.ai_system_history USING btree (organization_id, created_at DESC);


--
-- Name: idx_ai_system_history_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_system_history_system ON fluxion.ai_system_history USING btree (ai_system_id, created_at DESC);


--
-- Name: idx_ai_systems_agentic; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_agentic ON fluxion.ai_systems USING btree (organization_id) WHERE (ai_system_type = 'agentico'::fluxion.ai_system_type);


--
-- Name: idx_ai_systems_biometric; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_biometric ON fluxion.ai_systems USING btree (organization_id) WHERE (uses_biometric_data = true);


--
-- Name: idx_ai_systems_fts; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_fts ON fluxion.ai_systems USING gin (to_tsvector('spanish'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_ai_systems_high_risk; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_high_risk ON fluxion.ai_systems USING btree (organization_id) WHERE (aiact_risk_level = 'high'::fluxion.aiact_risk_level);


--
-- Name: idx_ai_systems_internal_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE UNIQUE INDEX idx_ai_systems_internal_id ON fluxion.ai_systems USING btree (organization_id, internal_id) WHERE (internal_id IS NOT NULL);


--
-- Name: idx_ai_systems_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_org ON fluxion.ai_systems USING btree (organization_id);


--
-- Name: idx_ai_systems_org_domain; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_org_domain ON fluxion.ai_systems USING btree (organization_id, domain);


--
-- Name: idx_ai_systems_org_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_org_status ON fluxion.ai_systems USING btree (organization_id, status);


--
-- Name: idx_ai_systems_owner; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_owner ON fluxion.ai_systems USING btree (organization_id, ai_owner);


--
-- Name: idx_ai_systems_risk_level; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_risk_level ON fluxion.ai_systems USING btree (organization_id, aiact_risk_level);


--
-- Name: idx_ai_systems_tags; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ai_systems_tags ON fluxion.ai_systems USING gin (tags);


--
-- Name: idx_api_keys_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_api_keys_org ON fluxion.api_keys USING btree (organization_id, created_at DESC);


--
-- Name: idx_assistant_conv_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_assistant_conv_org ON fluxion.assistant_conversations USING btree (organization_id, last_message_at DESC);


--
-- Name: idx_assistant_conv_user; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_assistant_conv_user ON fluxion.assistant_conversations USING btree (user_id, last_message_at DESC);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_audit_log_action ON fluxion.audit_log USING btree (organization_id, action, created_at DESC);


--
-- Name: idx_audit_log_actor; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_audit_log_actor ON fluxion.audit_log USING btree (actor_id, created_at DESC);


--
-- Name: idx_audit_log_org_time; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_audit_log_org_time ON fluxion.audit_log USING btree (organization_id, created_at DESC);


--
-- Name: idx_classification_diffs_event; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_classification_diffs_event ON fluxion.classification_diffs USING btree (classification_event_id);


--
-- Name: idx_classification_diffs_pending; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_classification_diffs_pending ON fluxion.classification_diffs USING btree (ai_system_id, resolution) WHERE (resolution IS NULL);


--
-- Name: idx_classification_events_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_classification_events_org ON fluxion.classification_events USING btree (organization_id);


--
-- Name: idx_classification_events_system_reconciled; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_classification_events_system_reconciled ON fluxion.classification_events USING btree (ai_system_id, status) WHERE (status = 'reconciled'::fluxion.classification_event_status);


--
-- Name: idx_classification_reviews_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_classification_reviews_org ON fluxion.ai_system_classification_reviews USING btree (organization_id, reviewed_at DESC);


--
-- Name: idx_classification_reviews_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_classification_reviews_system ON fluxion.ai_system_classification_reviews USING btree (ai_system_id, reviewed_at DESC);


--
-- Name: idx_committee_members_committee; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_committee_members_committee ON fluxion.committee_members USING btree (committee_id);


--
-- Name: idx_committee_members_profile; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_committee_members_profile ON fluxion.committee_members USING btree (profile_id);


--
-- Name: idx_committees_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_committees_org ON fluxion.committees USING btree (organization_id);


--
-- Name: idx_evidence_expiry_alerts_evidence; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_evidence_expiry_alerts_evidence ON fluxion.evidence_expiry_alerts USING btree (evidence_id);


--
-- Name: idx_evidence_expiry_alerts_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_evidence_expiry_alerts_org ON fluxion.evidence_expiry_alerts USING btree (organization_id, dismissed, created_at DESC);


--
-- Name: idx_evidences_unvalidated; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_evidences_unvalidated ON fluxion.evidences USING btree (organization_id, created_at) WHERE (validated_by IS NULL);


--
-- Name: idx_evidences_valid_until; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_evidences_valid_until ON fluxion.evidences USING btree (organization_id, valid_until) WHERE (valid_until IS NOT NULL);


--
-- Name: idx_fluxion_evidences_verification_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_fluxion_evidences_verification_status ON fluxion.evidences USING btree (organization_id, verification_status, created_at DESC);


--
-- Name: idx_fmea_evaluations_system_state; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_fmea_evaluations_system_state ON fluxion.fmea_evaluations USING btree (system_id, state, version DESC);


--
-- Name: idx_fmea_item_history_eval; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_fmea_item_history_eval ON fluxion.fmea_item_history USING btree (evaluation_id);


--
-- Name: idx_fmea_item_history_item; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_fmea_item_history_item ON fluxion.fmea_item_history USING btree (item_id);


--
-- Name: idx_fmea_items_second_review; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_fmea_items_second_review ON fluxion.fmea_items USING btree (evaluation_id, second_review_status) WHERE (requires_second_review = true);


--
-- Name: idx_fmea_items_unique_mode; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE UNIQUE INDEX idx_fmea_items_unique_mode ON fluxion.fmea_items USING btree (evaluation_id, failure_mode_id);


--
-- Name: idx_gap_dispositions_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_gap_dispositions_org ON fluxion.gap_dispositions USING btree (organization_id);


--
-- Name: idx_invitations_email_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_invitations_email_org ON fluxion.invitations USING btree (email, organization_id);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_invitations_status ON fluxion.invitations USING btree (status);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_invitations_token ON fluxion.invitations USING btree (token);


--
-- Name: idx_member_role_changes_member; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_member_role_changes_member ON fluxion.member_role_changes USING btree (member_id, created_at DESC);


--
-- Name: idx_member_role_changes_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_member_role_changes_org ON fluxion.member_role_changes USING btree (organization_id, created_at DESC);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_notifications_recipient ON fluxion.notifications USING btree (recipient_id, created_at DESC);


--
-- Name: idx_notifications_task; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_notifications_task ON fluxion.notifications USING btree (related_task_id) WHERE (related_task_id IS NOT NULL);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON fluxion.notifications USING btree (recipient_id) WHERE (read_at IS NULL);


--
-- Name: idx_one_pending_reconciliation; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE UNIQUE INDEX idx_one_pending_reconciliation ON fluxion.classification_events USING btree (ai_system_id) WHERE (status = 'pending_reconciliation'::fluxion.classification_event_status);


--
-- Name: idx_organizations_parent_org_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_organizations_parent_org_id ON fluxion.organizations USING btree (parent_org_id) WHERE (parent_org_id IS NOT NULL);


--
-- Name: idx_organizations_tax_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_organizations_tax_id ON fluxion.organizations USING btree (tax_id) WHERE (tax_id IS NOT NULL);


--
-- Name: idx_profile_systems_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profile_systems_org ON fluxion.profile_systems USING btree (organization_id);


--
-- Name: idx_profile_systems_profile; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profile_systems_profile ON fluxion.profile_systems USING btree (profile_id);


--
-- Name: idx_profile_systems_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profile_systems_system ON fluxion.profile_systems USING btree (ai_system_id);


--
-- Name: idx_profiles_manager_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profiles_manager_id ON fluxion.profiles USING btree (manager_id) WHERE (manager_id IS NOT NULL);


--
-- Name: idx_profiles_organization; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profiles_organization ON fluxion.profiles USING btree (organization_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profiles_role ON fluxion.profiles USING btree (role);


--
-- Name: idx_profiles_user; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_profiles_user ON fluxion.profiles USING btree (user_id);


--
-- Name: idx_recurrence_runs_rec; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_recurrence_runs_rec ON fluxion.task_recurrence_runs USING btree (recurrence_id, created_at DESC);


--
-- Name: idx_sessions_committee; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sessions_committee ON fluxion.committee_sessions USING btree (committee_id);


--
-- Name: idx_sessions_scheduled; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sessions_scheduled ON fluxion.committee_sessions USING btree (scheduled_at);


--
-- Name: idx_sfm_human_changes; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sfm_human_changes ON fluxion.system_failure_modes USING btree (priority_changed_by, priority_changed_at) WHERE (priority_source = 'human'::fluxion.priority_source);


--
-- Name: idx_sfm_pending_review; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sfm_pending_review ON fluxion.system_failure_modes USING btree (ai_system_id) WHERE (priority_status = 'pending_review'::fluxion.priority_status);


--
-- Name: idx_sfm_prioritized; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sfm_prioritized ON fluxion.system_failure_modes USING btree (ai_system_id, priority_status) WHERE (priority_status = 'prioritized'::fluxion.priority_status);


--
-- Name: idx_sfm_quota_dropped; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sfm_quota_dropped ON fluxion.system_failure_modes USING btree (ai_system_id) WHERE (quota_dropped = true);


--
-- Name: idx_sfm_score_by_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sfm_score_by_system ON fluxion.system_failure_modes USING btree (ai_system_id, priority_score DESC NULLS LAST);


--
-- Name: idx_sfme_evidence_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_sfme_evidence_id ON fluxion.system_failure_mode_evidences USING btree (evidence_id);


--
-- Name: idx_soa_controls_log_control; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_soa_controls_log_control ON fluxion.soa_controls_log USING btree (soa_control_id, created_at DESC);


--
-- Name: idx_soa_controls_log_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_soa_controls_log_org ON fluxion.soa_controls_log USING btree (organization_id, created_at DESC);


--
-- Name: idx_soa_lifecycle_log_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_soa_lifecycle_log_org ON fluxion.soa_lifecycle_log USING btree (organization_id, created_at DESC);


--
-- Name: idx_soa_metadata_lifecycle_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_soa_metadata_lifecycle_status ON fluxion.organization_soa_metadata USING btree (organization_id, lifecycle_status);


--
-- Name: idx_system_evidence_versions_evidence_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_evidence_versions_evidence_id ON fluxion.system_evidence_versions USING btree (evidence_id, changed_at DESC);


--
-- Name: idx_system_evidences_org_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_evidences_org_status ON fluxion.system_evidences USING btree (organization_id, status);


--
-- Name: idx_system_evidences_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_evidences_system ON fluxion.system_evidences USING btree (ai_system_id, created_at DESC);


--
-- Name: idx_system_evidences_tags; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_evidences_tags ON fluxion.system_evidences USING gin (tags);


--
-- Name: idx_system_failure_modes_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_failure_modes_org ON fluxion.system_failure_modes USING btree (organization_id, activation_source);


--
-- Name: idx_system_failure_modes_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_failure_modes_system ON fluxion.system_failure_modes USING btree (ai_system_id, dimension_id);


--
-- Name: idx_system_obligation_evidences_evidence; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_obligation_evidences_evidence ON fluxion.system_obligation_evidences USING btree (evidence_id);


--
-- Name: idx_system_obligations_active; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_obligations_active ON fluxion.system_obligations USING btree (ai_system_id) WHERE (archived_at IS NULL);


--
-- Name: idx_system_obligations_framework; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_obligations_framework ON fluxion.system_obligations USING btree (ai_system_id, source_framework);


--
-- Name: idx_system_obligations_org_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_obligations_org_status ON fluxion.system_obligations USING btree (organization_id, status);


--
-- Name: idx_system_obligations_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_obligations_system ON fluxion.system_obligations USING btree (ai_system_id);


--
-- Name: idx_system_report_snapshots_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_report_snapshots_org ON fluxion.system_report_snapshots USING btree (organization_id, report_type, created_at DESC);


--
-- Name: idx_system_report_snapshots_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_system_report_snapshots_system ON fluxion.system_report_snapshots USING btree (ai_system_id, report_type, created_at DESC);


--
-- Name: idx_ta_acceptance_review; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_acceptance_review ON fluxion.treatment_actions USING btree (organization_id, review_due_date) WHERE ((option = 'aceptar'::fluxion.treatment_option) AND (status = 'accepted'::fluxion.treatment_action_status) AND (review_due_date IS NOT NULL));


--
-- Name: idx_ta_fmea_item; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_fmea_item ON fluxion.treatment_actions USING btree (fmea_item_id);


--
-- Name: idx_ta_owner; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_owner ON fluxion.treatment_actions USING btree (owner_id) WHERE (owner_id IS NOT NULL);


--
-- Name: idx_ta_pending_by_owner; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_pending_by_owner ON fluxion.treatment_actions USING btree (owner_id, due_date) WHERE ((status = ANY (ARRAY['pending'::fluxion.treatment_action_status, 'in_progress'::fluxion.treatment_action_status, 'evidence_pending'::fluxion.treatment_action_status])) AND (owner_id IS NOT NULL));


--
-- Name: idx_ta_plan; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_plan ON fluxion.treatment_actions USING btree (plan_id);


--
-- Name: idx_ta_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_status ON fluxion.treatment_actions USING btree (plan_id, status);


--
-- Name: idx_ta_task_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_ta_task_id ON fluxion.treatment_actions USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- Name: idx_task_activity_actor; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_activity_actor ON fluxion.task_activity_log USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_task_activity_task; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_activity_task ON fluxion.task_activity_log USING btree (task_id, created_at DESC);


--
-- Name: idx_task_attachments_task; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_attachments_task ON fluxion.task_attachments USING btree (task_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_attachments_uploader; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_attachments_uploader ON fluxion.task_attachments USING btree (uploader_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_checklist_task_id; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_checklist_task_id ON fluxion.task_checklist_items USING btree (task_id);


--
-- Name: idx_task_comments_author; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_comments_author ON fluxion.task_comments USING btree (author_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_comments_mentions; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_comments_mentions ON fluxion.task_comments USING gin (mentions) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_comments_task; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_comments_task ON fluxion.task_comments USING btree (task_id, created_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_recurrences_active; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_recurrences_active ON fluxion.task_recurrences USING btree (active, next_run_at) WHERE (active = true);


--
-- Name: idx_task_recurrences_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_recurrences_org ON fluxion.task_recurrences USING btree (organization_id);


--
-- Name: idx_task_saved_views_org_owner; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_saved_views_org_owner ON fluxion.task_saved_views USING btree (organization_id, owner_id);


--
-- Name: idx_task_templates_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_templates_org ON fluxion.task_templates USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_task_templates_scope; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_templates_scope ON fluxion.task_templates USING btree (scope);


--
-- Name: idx_task_watchers_user; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_task_watchers_user ON fluxion.task_watchers USING btree (user_id);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_assignee ON fluxion.tasks USING btree (assignee_id) WHERE (assignee_id IS NOT NULL);


--
-- Name: idx_tasks_due_date_open; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_due_date_open ON fluxion.tasks USING btree (organization_id, due_date) WHERE ((status <> ALL (ARRAY['done'::fluxion.task_status, 'cancelled'::fluxion.task_status])) AND (due_date IS NOT NULL));


--
-- Name: idx_tasks_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_org ON fluxion.tasks USING btree (organization_id);


--
-- Name: idx_tasks_source; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_source ON fluxion.tasks USING btree (source_type, source_id) WHERE (source_id IS NOT NULL);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_status ON fluxion.tasks USING btree (organization_id, status);


--
-- Name: idx_tasks_status_position; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_status_position ON fluxion.tasks USING btree (organization_id, status, "position");


--
-- Name: idx_tasks_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tasks_system ON fluxion.tasks USING btree (system_id) WHERE (system_id IS NOT NULL);


--
-- Name: idx_tp_deadline_overdue; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tp_deadline_overdue ON fluxion.treatment_plans USING btree (organization_id, deadline) WHERE (status = ANY (ARRAY['draft'::fluxion.treatment_plan_status, 'in_review'::fluxion.treatment_plan_status, 'approved'::fluxion.treatment_plan_status, 'in_progress'::fluxion.treatment_plan_status]));


--
-- Name: idx_tp_evaluation; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tp_evaluation ON fluxion.treatment_plans USING btree (evaluation_id);


--
-- Name: idx_tp_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tp_org ON fluxion.treatment_plans USING btree (organization_id);


--
-- Name: idx_tp_status; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tp_status ON fluxion.treatment_plans USING btree (organization_id, status);


--
-- Name: idx_tp_system; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tp_system ON fluxion.treatment_plans USING btree (system_id);


--
-- Name: idx_tp_zona_i_active; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_tp_zona_i_active ON fluxion.treatment_plans USING btree (organization_id, deadline) WHERE ((zone_at_creation = 'zona_i'::text) AND (status = ANY (ARRAY['approved'::fluxion.treatment_plan_status, 'in_progress'::fluxion.treatment_plan_status])));


--
-- Name: idx_treatment_action_events_action; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_events_action ON fluxion.treatment_action_events USING btree (action_id, occurred_at DESC);


--
-- Name: idx_treatment_action_events_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_events_org ON fluxion.treatment_action_events USING btree (organization_id, occurred_at DESC);


--
-- Name: idx_treatment_action_events_plan; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_events_plan ON fluxion.treatment_action_events USING btree (plan_id, occurred_at DESC);


--
-- Name: idx_treatment_action_events_type; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_events_type ON fluxion.treatment_action_events USING btree (plan_id, event_type);


--
-- Name: idx_treatment_action_reviews_action; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_reviews_action ON fluxion.treatment_action_reviews USING btree (action_id, reviewed_at DESC);


--
-- Name: idx_treatment_action_reviews_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_reviews_org ON fluxion.treatment_action_reviews USING btree (organization_id, reviewed_at DESC);


--
-- Name: idx_treatment_action_reviews_plan; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_action_reviews_plan ON fluxion.treatment_action_reviews USING btree (plan_id, reviewed_at DESC);


--
-- Name: idx_treatment_actions_plan_item; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_actions_plan_item ON fluxion.treatment_actions_legacy_20260417 USING btree (treatment_plan_id, fmea_item_id);


--
-- Name: idx_treatment_actions_review_due; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_actions_review_due ON fluxion.treatment_actions USING btree (organization_id, review_due_date) WHERE ((review_due_date IS NOT NULL) AND (status <> ALL (ARRAY['cancelled'::fluxion.treatment_action_status, 'completed'::fluxion.treatment_action_status])));


--
-- Name: idx_treatment_plan_snapshots_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_plan_snapshots_org ON fluxion.treatment_plan_snapshots USING btree (organization_id, captured_at DESC);


--
-- Name: idx_treatment_plan_snapshots_plan; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_plan_snapshots_plan ON fluxion.treatment_plan_snapshots USING btree (plan_id, captured_at DESC);


--
-- Name: idx_treatment_plan_snapshots_trigger; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_treatment_plan_snapshots_trigger ON fluxion.treatment_plan_snapshots USING btree (plan_id, trigger);


--
-- Name: idx_webhooks_org; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX idx_webhooks_org ON fluxion.webhooks USING btree (organization_id, created_at DESC);


--
-- Name: task_gap_links_gap_source_id_idx; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX task_gap_links_gap_source_id_idx ON fluxion.task_gap_links USING btree (gap_source_id);


--
-- Name: task_gap_links_group_key_idx; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX task_gap_links_group_key_idx ON fluxion.task_gap_links USING btree (group_key);


--
-- Name: task_gap_links_task_id_idx; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE INDEX task_gap_links_task_id_idx ON fluxion.task_gap_links USING btree (task_id);


--
-- Name: uq_task_saved_views_default_personal; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE UNIQUE INDEX uq_task_saved_views_default_personal ON fluxion.task_saved_views USING btree (organization_id, owner_id) WHERE ((is_default = true) AND (scope = 'personal'::text));


--
-- Name: uq_task_saved_views_default_shared; Type: INDEX; Schema: fluxion; Owner: postgres
--

CREATE UNIQUE INDEX uq_task_saved_views_default_shared ON fluxion.task_saved_views USING btree (organization_id) WHERE ((is_default = true) AND (scope = 'shared'::text));


--
-- Name: idx_chunks_content_fts_en; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_content_fts_en ON rag.chunks USING gin (to_tsvector('english'::regconfig, content)) WHERE ((is_active = true) AND (language = 'en'::text));


--
-- Name: idx_chunks_content_fts_es; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_content_fts_es ON rag.chunks USING gin (to_tsvector('spanish'::regconfig, content)) WHERE ((is_active = true) AND ((language IS NULL) OR (language = 'es'::text)));


--
-- Name: idx_chunks_document; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_document ON rag.chunks USING btree (document_id) WHERE (is_active = true);


--
-- Name: idx_chunks_embedding_hnsw; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_embedding_hnsw ON rag.chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64') WHERE (is_active = true);


--
-- Name: idx_chunks_global_hnsw; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_global_hnsw ON rag.chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64') WHERE (is_active = true);


--
-- Name: idx_chunks_metadata_gin; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_metadata_gin ON rag.chunks USING gin (metadata);


--
-- Name: idx_chunks_short_name; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_short_name ON rag.chunks USING btree (short_name) WHERE ((is_active = true) AND (short_name IS NOT NULL));


--
-- Name: idx_chunks_source_short_name; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_source_short_name ON rag.chunks USING btree (source_type, short_name) WHERE (is_active = true);


--
-- Name: idx_chunks_source_type; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_chunks_source_type ON rag.chunks USING btree (source_type) WHERE (is_active = true);


--
-- Name: idx_documents_source_type; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_documents_source_type ON rag.documents USING btree (source_type, language);


--
-- Name: idx_ingestion_jobs_document; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_ingestion_jobs_document ON rag.ingestion_jobs USING btree (document_id, status);


--
-- Name: idx_org_chunks_document; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_document ON rag.organization_chunks USING btree (document_id) WHERE (is_active = true);


--
-- Name: idx_org_chunks_embedding_hnsw; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_embedding_hnsw ON rag.organization_chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64') WHERE (is_active = true);


--
-- Name: idx_org_chunks_fts_en; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_fts_en ON rag.organization_chunks USING gin (to_tsvector('english'::regconfig, content)) WHERE ((is_active = true) AND (language = 'en'::text));


--
-- Name: idx_org_chunks_fts_es; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_fts_es ON rag.organization_chunks USING gin (to_tsvector('spanish'::regconfig, content)) WHERE ((is_active = true) AND ((language IS NULL) OR (language = 'es'::text)));


--
-- Name: idx_org_chunks_metadata_gin; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_metadata_gin ON rag.organization_chunks USING gin (metadata);


--
-- Name: idx_org_chunks_org_source; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_org_source ON rag.organization_chunks USING btree (organization_id, source_type) WHERE (is_active = true);


--
-- Name: idx_org_chunks_short_name; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_chunks_short_name ON rag.organization_chunks USING btree (short_name) WHERE ((is_active = true) AND (short_name IS NOT NULL));


--
-- Name: idx_org_documents_org; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_documents_org ON rag.organization_documents USING btree (organization_id);


--
-- Name: idx_org_documents_source_type; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_documents_source_type ON rag.organization_documents USING btree (source_type, language);


--
-- Name: idx_org_ingestion_jobs_document; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_ingestion_jobs_document ON rag.org_ingestion_jobs USING btree (document_id, status);


--
-- Name: idx_org_ingestion_jobs_org; Type: INDEX; Schema: rag; Owner: postgres
--

CREATE INDEX idx_org_ingestion_jobs_org ON rag.org_ingestion_jobs USING btree (organization_id, status);


--
-- Name: organization_soa_controls set_organization_soa_controls_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER set_organization_soa_controls_updated_at BEFORE UPDATE ON fluxion.organization_soa_controls FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: task_checklist_items task_checklist_items_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER task_checklist_items_updated_at BEFORE UPDATE ON fluxion.task_checklist_items FOR EACH ROW EXECUTE FUNCTION fluxion.set_task_checklist_updated_at();


--
-- Name: task_recurrences task_recurrences_init_next_run; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER task_recurrences_init_next_run BEFORE INSERT ON fluxion.task_recurrences FOR EACH ROW EXECUTE FUNCTION fluxion.init_recurrence_next_run();


--
-- Name: task_recurrences task_recurrences_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER task_recurrences_updated_at BEFORE UPDATE ON fluxion.task_recurrences FOR EACH ROW EXECUTE FUNCTION fluxion.set_task_recurrences_updated_at();


--
-- Name: task_templates task_templates_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER task_templates_updated_at BEFORE UPDATE ON fluxion.task_templates FOR EACH ROW EXECUTE FUNCTION fluxion.set_task_templates_updated_at();


--
-- Name: treatment_actions trg_action_updates_plan; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_action_updates_plan AFTER INSERT OR UPDATE ON fluxion.treatment_actions FOR EACH ROW EXECUTE FUNCTION fluxion.trigger_update_plan_zone_target();


--
-- Name: ai_systems trg_ai_systems_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_ai_systems_updated_at BEFORE UPDATE ON fluxion.ai_systems FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: aisia_assessments trg_aisia_assessments_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_aisia_assessments_updated_at BEFORE UPDATE ON fluxion.aisia_assessments FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: aisia_sections trg_aisia_sections_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_aisia_sections_updated_at BEFORE UPDATE ON fluxion.aisia_sections FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: classification_events trg_classification_events_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_classification_events_updated_at BEFORE UPDATE ON fluxion.classification_events FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();


--
-- Name: committees trg_committees_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_committees_updated_at BEFORE UPDATE ON fluxion.committees FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();


--
-- Name: treatment_actions trg_complete_action; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_complete_action BEFORE UPDATE ON fluxion.treatment_actions FOR EACH ROW WHEN (((new.status = 'completed'::fluxion.treatment_action_status) AND (old.status <> 'completed'::fluxion.treatment_action_status))) EXECUTE FUNCTION fluxion.trigger_evidence_closes_action();


--
-- Name: evidences trg_evidences_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_evidences_updated_at BEFORE UPDATE ON fluxion.evidences FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: fmea_evaluations trg_fmea_evaluations_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_fmea_evaluations_updated_at BEFORE UPDATE ON fluxion.fmea_evaluations FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: fmea_items trg_fmea_items_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_fmea_items_updated_at BEFORE UPDATE ON fluxion.fmea_items FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON fluxion.profiles FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();


--
-- Name: committee_sessions trg_session_number; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_session_number BEFORE INSERT ON fluxion.committee_sessions FOR EACH ROW EXECUTE FUNCTION fluxion.set_session_number();


--
-- Name: committee_sessions trg_sessions_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON fluxion.committee_sessions FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();


--
-- Name: system_evidences trg_system_evidences_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_system_evidences_updated_at BEFORE UPDATE ON fluxion.system_evidences FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: system_failure_modes trg_system_failure_modes_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_system_failure_modes_updated_at BEFORE UPDATE ON fluxion.system_failure_modes FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: system_obligations trg_system_obligations_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_system_obligations_updated_at BEFORE UPDATE ON fluxion.system_obligations FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: tasks trg_task_done_propagate; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_task_done_propagate BEFORE UPDATE ON fluxion.tasks FOR EACH ROW EXECUTE FUNCTION fluxion.trg_task_done_propagate();


--
-- Name: task_saved_views trg_task_saved_views_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_task_saved_views_updated_at BEFORE UPDATE ON fluxion.task_saved_views FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON fluxion.tasks FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: treatment_actions trg_treatment_action_create_task; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_treatment_action_create_task BEFORE INSERT ON fluxion.treatment_actions FOR EACH ROW WHEN ((new.option <> 'aceptar'::fluxion.treatment_option)) EXECUTE FUNCTION fluxion.trg_treatment_action_create_task();


--
-- Name: treatment_actions trg_treatment_action_sync_task; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_treatment_action_sync_task AFTER UPDATE ON fluxion.treatment_actions FOR EACH ROW EXECUTE FUNCTION fluxion.trg_treatment_action_sync_task();


--
-- Name: treatment_actions trg_treatment_actions_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_treatment_actions_updated_at BEFORE UPDATE ON fluxion.treatment_actions FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: treatment_actions_legacy_20260417 trg_treatment_actions_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_treatment_actions_updated_at BEFORE UPDATE ON fluxion.treatment_actions_legacy_20260417 FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: treatment_plans trg_treatment_plans_updated_at; Type: TRIGGER; Schema: fluxion; Owner: postgres
--

CREATE TRIGGER trg_treatment_plans_updated_at BEFORE UPDATE ON fluxion.treatment_plans FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


--
-- Name: causal_node_failure_mode_links causal_node_failure_mode_links_causal_node_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_node_failure_mode_links
    ADD CONSTRAINT causal_node_failure_mode_links_causal_node_id_fkey FOREIGN KEY (causal_node_id) REFERENCES compliance.causal_nodes(id) ON DELETE CASCADE;


--
-- Name: causal_node_failure_mode_links causal_node_failure_mode_links_failure_mode_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_node_failure_mode_links
    ADD CONSTRAINT causal_node_failure_mode_links_failure_mode_id_fkey FOREIGN KEY (failure_mode_id) REFERENCES compliance.failure_modes(id) ON DELETE CASCADE;


--
-- Name: causal_relationships causal_relationships_family_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_relationships
    ADD CONSTRAINT causal_relationships_family_id_fkey FOREIGN KEY (family_id) REFERENCES compliance.causal_families(id) ON DELETE CASCADE;


--
-- Name: causal_relationships causal_relationships_source_node_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_relationships
    ADD CONSTRAINT causal_relationships_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES compliance.causal_nodes(id) ON DELETE CASCADE;


--
-- Name: causal_relationships causal_relationships_target_node_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.causal_relationships
    ADD CONSTRAINT causal_relationships_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES compliance.causal_nodes(id) ON DELETE CASCADE;


--
-- Name: failure_mode_causal_relations failure_mode_causal_relations_source_fm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_mode_causal_relations
    ADD CONSTRAINT failure_mode_causal_relations_source_fm_id_fkey FOREIGN KEY (source_fm_id) REFERENCES compliance.failure_modes(id) ON DELETE CASCADE;


--
-- Name: failure_mode_causal_relations failure_mode_causal_relations_target_fm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_mode_causal_relations
    ADD CONSTRAINT failure_mode_causal_relations_target_fm_id_fkey FOREIGN KEY (target_fm_id) REFERENCES compliance.failure_modes(id) ON DELETE CASCADE;


--
-- Name: failure_mode_control_refs failure_mode_control_refs_control_template_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_mode_control_refs
    ADD CONSTRAINT failure_mode_control_refs_control_template_id_fkey FOREIGN KEY (control_template_id) REFERENCES compliance.control_templates(id) ON DELETE CASCADE;


--
-- Name: failure_mode_control_refs failure_mode_control_refs_failure_mode_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_mode_control_refs
    ADD CONSTRAINT failure_mode_control_refs_failure_mode_id_fkey FOREIGN KEY (failure_mode_id) REFERENCES compliance.failure_modes(id) ON DELETE CASCADE;


--
-- Name: failure_modes failure_modes_dimension_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.failure_modes
    ADD CONSTRAINT failure_modes_dimension_id_fkey FOREIGN KEY (dimension_id) REFERENCES compliance.risk_dimensions(id);


--
-- Name: obligation_evidence_types obligation_evidence_types_evidence_type_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.obligation_evidence_types
    ADD CONSTRAINT obligation_evidence_types_evidence_type_id_fkey FOREIGN KEY (evidence_type_id) REFERENCES compliance.evidence_types(id) ON DELETE CASCADE;


--
-- Name: obligation_evidence_types obligation_evidence_types_obligation_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.obligation_evidence_types
    ADD CONSTRAINT obligation_evidence_types_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES compliance.obligations(id) ON DELETE CASCADE;


--
-- Name: requirement_control_mappings requirement_control_mappings_control_template_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.requirement_control_mappings
    ADD CONSTRAINT requirement_control_mappings_control_template_id_fkey FOREIGN KEY (control_template_id) REFERENCES compliance.control_templates(id) ON DELETE CASCADE;


--
-- Name: requirement_control_mappings requirement_control_mappings_requirement_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.requirement_control_mappings
    ADD CONSTRAINT requirement_control_mappings_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES compliance.requirements(id) ON DELETE CASCADE;


--
-- Name: requirements requirements_framework_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: postgres
--

ALTER TABLE ONLY compliance.requirements
    ADD CONSTRAINT requirements_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES compliance.frameworks(id) ON DELETE CASCADE;


--
-- Name: agent_messages agent_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.agent_messages
    ADD CONSTRAINT agent_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES fluxion.agent_sessions(id) ON DELETE CASCADE;


--
-- Name: agent_sessions agent_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.agent_sessions
    ADD CONSTRAINT agent_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_sessions agent_sessions_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.agent_sessions
    ADD CONSTRAINT agent_sessions_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL;


--
-- Name: ai_system_classification_reviews ai_system_classification_reviews_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_classification_reviews
    ADD CONSTRAINT ai_system_classification_reviews_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: ai_system_classification_reviews ai_system_classification_reviews_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_classification_reviews
    ADD CONSTRAINT ai_system_classification_reviews_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_system_classification_reviews ai_system_classification_reviews_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_classification_reviews
    ADD CONSTRAINT ai_system_classification_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ai_system_history ai_system_history_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_history
    ADD CONSTRAINT ai_system_history_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ai_system_history ai_system_history_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_history
    ADD CONSTRAINT ai_system_history_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: ai_system_history ai_system_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_system_history
    ADD CONSTRAINT ai_system_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_systems ai_systems_classification_session_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_systems
    ADD CONSTRAINT ai_systems_classification_session_id_fkey FOREIGN KEY (classification_session_id) REFERENCES fluxion.agent_sessions(id);


--
-- Name: ai_systems ai_systems_current_classification_event_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_systems
    ADD CONSTRAINT ai_systems_current_classification_event_id_fkey FOREIGN KEY (current_classification_event_id) REFERENCES fluxion.classification_events(id);


--
-- Name: ai_systems ai_systems_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.ai_systems
    ADD CONSTRAINT ai_systems_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: aisia_ai_generations aisia_ai_generations_assessment_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_ai_generations
    ADD CONSTRAINT aisia_ai_generations_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES fluxion.aisia_assessments(id) ON DELETE CASCADE;


--
-- Name: aisia_ai_generations aisia_ai_generations_triggered_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_ai_generations
    ADD CONSTRAINT aisia_ai_generations_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES fluxion.profiles(id) ON DELETE RESTRICT;


--
-- Name: aisia_assessments aisia_assessments_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: aisia_assessments aisia_assessments_approved_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: aisia_assessments aisia_assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id) ON DELETE RESTRICT;


--
-- Name: aisia_assessments aisia_assessments_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: aisia_assessments aisia_assessments_rejected_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: aisia_assessments aisia_assessments_submitted_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_assessments
    ADD CONSTRAINT aisia_assessments_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: aisia_sections aisia_sections_assessment_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.aisia_sections
    ADD CONSTRAINT aisia_sections_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES fluxion.aisia_assessments(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: api_keys api_keys_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.api_keys
    ADD CONSTRAINT api_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: assistant_conversations assistant_conversations_context_system_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.assistant_conversations
    ADD CONSTRAINT assistant_conversations_context_system_fkey FOREIGN KEY (context_system) REFERENCES fluxion.ai_systems(id);


--
-- Name: assistant_conversations assistant_conversations_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.assistant_conversations
    ADD CONSTRAINT assistant_conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id);


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.audit_log
    ADD CONSTRAINT audit_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: causal_graph_instances causal_graph_instances_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.causal_graph_instances
    ADD CONSTRAINT causal_graph_instances_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE;


--
-- Name: classification_diffs classification_diffs_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_diffs
    ADD CONSTRAINT classification_diffs_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: classification_diffs classification_diffs_classification_event_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_diffs
    ADD CONSTRAINT classification_diffs_classification_event_id_fkey FOREIGN KEY (classification_event_id) REFERENCES fluxion.classification_events(id) ON DELETE CASCADE;


--
-- Name: classification_diffs classification_diffs_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_diffs
    ADD CONSTRAINT classification_diffs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: classification_diffs classification_diffs_previous_obligation_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_diffs
    ADD CONSTRAINT classification_diffs_previous_obligation_id_fkey FOREIGN KEY (previous_obligation_id) REFERENCES fluxion.system_obligations(id);


--
-- Name: classification_diffs classification_diffs_resolved_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_diffs
    ADD CONSTRAINT classification_diffs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES fluxion.profiles(id);


--
-- Name: classification_events classification_events_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_events
    ADD CONSTRAINT classification_events_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: classification_events classification_events_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_events
    ADD CONSTRAINT classification_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id);


--
-- Name: classification_events classification_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.classification_events
    ADD CONSTRAINT classification_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: committee_members committee_members_added_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_members
    ADD CONSTRAINT committee_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES fluxion.profiles(id);


--
-- Name: committee_members committee_members_committee_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_members
    ADD CONSTRAINT committee_members_committee_id_fkey FOREIGN KEY (committee_id) REFERENCES fluxion.committees(id) ON DELETE CASCADE;


--
-- Name: committee_members committee_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_members
    ADD CONSTRAINT committee_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: committee_members committee_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_members
    ADD CONSTRAINT committee_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: committee_sessions committee_sessions_committee_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_committee_id_fkey FOREIGN KEY (committee_id) REFERENCES fluxion.committees(id) ON DELETE CASCADE;


--
-- Name: committee_sessions committee_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id);


--
-- Name: committee_sessions committee_sessions_minutes_locked_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_minutes_locked_by_fkey FOREIGN KEY (minutes_locked_by) REFERENCES fluxion.profiles(id);


--
-- Name: committee_sessions committee_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: committees committees_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.committees
    ADD CONSTRAINT committees_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: controls controls_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.controls
    ADD CONSTRAINT controls_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: controls controls_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.controls
    ADD CONSTRAINT controls_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: controls controls_template_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.controls
    ADD CONSTRAINT controls_template_id_fkey FOREIGN KEY (template_id) REFERENCES compliance.control_templates(id);


--
-- Name: evidence_controls evidence_controls_control_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_controls
    ADD CONSTRAINT evidence_controls_control_id_fkey FOREIGN KEY (control_id) REFERENCES fluxion.controls(id) ON DELETE CASCADE;


--
-- Name: evidence_controls evidence_controls_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_controls
    ADD CONSTRAINT evidence_controls_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES fluxion.evidences(id) ON DELETE CASCADE;


--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_dismissed_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_expiry_alerts
    ADD CONSTRAINT evidence_expiry_alerts_dismissed_by_fkey FOREIGN KEY (dismissed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_expiry_alerts
    ADD CONSTRAINT evidence_expiry_alerts_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE;


--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidence_expiry_alerts
    ADD CONSTRAINT evidence_expiry_alerts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: evidences evidences_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.evidences
    ADD CONSTRAINT evidences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: fmea_evaluations fmea_evaluations_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_evaluations
    ADD CONSTRAINT fmea_evaluations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: fmea_evaluations fmea_evaluations_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_evaluations
    ADD CONSTRAINT fmea_evaluations_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: fmea_item_history fmea_item_history_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_item_history
    ADD CONSTRAINT fmea_item_history_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE;


--
-- Name: fmea_item_history fmea_item_history_item_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_item_history
    ADD CONSTRAINT fmea_item_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES fluxion.fmea_items(id) ON DELETE CASCADE;


--
-- Name: fmea_item_history fmea_item_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_item_history
    ADD CONSTRAINT fmea_item_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: fmea_items fmea_items_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_items
    ADD CONSTRAINT fmea_items_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE;


--
-- Name: fmea_items fmea_items_failure_mode_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.fmea_items
    ADD CONSTRAINT fmea_items_failure_mode_id_fkey FOREIGN KEY (failure_mode_id) REFERENCES compliance.failure_modes(id);


--
-- Name: gap_dispositions gap_dispositions_decided_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gap_dispositions
    ADD CONSTRAINT gap_dispositions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: gap_dispositions gap_dispositions_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gap_dispositions
    ADD CONSTRAINT gap_dispositions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: gaps gaps_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gaps
    ADD CONSTRAINT gaps_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: gaps gaps_requirement_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gaps
    ADD CONSTRAINT gaps_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES compliance.requirements(id);


--
-- Name: gaps gaps_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.gaps
    ADD CONSTRAINT gaps_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES fluxion.profiles(id);


--
-- Name: invitations invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.invitations
    ADD CONSTRAINT invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: member_role_changes member_role_changes_actor_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.member_role_changes
    ADD CONSTRAINT member_role_changes_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES fluxion.profiles(id) ON DELETE CASCADE;


--
-- Name: member_role_changes member_role_changes_member_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.member_role_changes
    ADD CONSTRAINT member_role_changes_member_id_fkey FOREIGN KEY (member_id) REFERENCES fluxion.profiles(id) ON DELETE CASCADE;


--
-- Name: member_role_changes member_role_changes_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.member_role_changes
    ADD CONSTRAINT member_role_changes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.notifications
    ADD CONSTRAINT notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES fluxion.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_related_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.notifications
    ADD CONSTRAINT notifications_related_task_id_fkey FOREIGN KEY (related_task_id) REFERENCES fluxion.tasks(id) ON DELETE SET NULL;


--
-- Name: organization_soa_controls organization_soa_controls_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_controls
    ADD CONSTRAINT organization_soa_controls_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_soa_controls organization_soa_controls_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_controls
    ADD CONSTRAINT organization_soa_controls_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: organization_soa_controls organization_soa_controls_validation_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_controls
    ADD CONSTRAINT organization_soa_controls_validation_evidence_id_fkey FOREIGN KEY (validation_evidence_id) REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL;


--
-- Name: organization_soa_metadata organization_soa_metadata_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_metadata
    ADD CONSTRAINT organization_soa_metadata_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_soa_system_links organization_soa_system_links_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_system_links
    ADD CONSTRAINT organization_soa_system_links_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: organization_soa_system_links organization_soa_system_links_soa_control_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organization_soa_system_links
    ADD CONSTRAINT organization_soa_system_links_soa_control_id_fkey FOREIGN KEY (soa_control_id) REFERENCES fluxion.organization_soa_controls(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_parent_org_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.organizations
    ADD CONSTRAINT organizations_parent_org_id_fkey FOREIGN KEY (parent_org_id) REFERENCES fluxion.organizations(id) ON DELETE SET NULL;


--
-- Name: profile_systems profile_systems_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profile_systems
    ADD CONSTRAINT profile_systems_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: profile_systems profile_systems_assigned_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profile_systems
    ADD CONSTRAINT profile_systems_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES fluxion.profiles(id);


--
-- Name: profile_systems profile_systems_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profile_systems
    ADD CONSTRAINT profile_systems_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: profile_systems profile_systems_profile_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profile_systems
    ADD CONSTRAINT profile_systems_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES fluxion.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_manager_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profiles
    ADD CONSTRAINT profiles_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reevaluation_triggers reevaluation_triggers_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.reevaluation_triggers
    ADD CONSTRAINT reevaluation_triggers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: reevaluation_triggers reevaluation_triggers_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.reevaluation_triggers
    ADD CONSTRAINT reevaluation_triggers_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: soa_controls_log soa_controls_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_controls_log
    ADD CONSTRAINT soa_controls_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: soa_controls_log soa_controls_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_controls_log
    ADD CONSTRAINT soa_controls_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: soa_controls_log soa_controls_log_soa_control_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_controls_log
    ADD CONSTRAINT soa_controls_log_soa_control_id_fkey FOREIGN KEY (soa_control_id) REFERENCES fluxion.organization_soa_controls(id) ON DELETE CASCADE;


--
-- Name: soa_lifecycle_log soa_lifecycle_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_lifecycle_log
    ADD CONSTRAINT soa_lifecycle_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: soa_lifecycle_log soa_lifecycle_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.soa_lifecycle_log
    ADD CONSTRAINT soa_lifecycle_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: system_evidence_versions system_evidence_versions_changed_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidence_versions
    ADD CONSTRAINT system_evidence_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: system_evidence_versions system_evidence_versions_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidence_versions
    ADD CONSTRAINT system_evidence_versions_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE;


--
-- Name: system_evidences system_evidences_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidences
    ADD CONSTRAINT system_evidences_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: system_evidences system_evidences_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidences
    ADD CONSTRAINT system_evidences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: system_evidences system_evidences_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidences
    ADD CONSTRAINT system_evidences_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_evidences system_evidences_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_evidences
    ADD CONSTRAINT system_evidences_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_failure_mode_evidences system_failure_mode_evidences_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_mode_evidences
    ADD CONSTRAINT system_failure_mode_evidences_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE;


--
-- Name: system_failure_mode_evidences system_failure_mode_evidences_linked_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_mode_evidences
    ADD CONSTRAINT system_failure_mode_evidences_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: system_failure_mode_evidences system_failure_mode_evidences_system_failure_mode_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_mode_evidences
    ADD CONSTRAINT system_failure_mode_evidences_system_failure_mode_id_fkey FOREIGN KEY (system_failure_mode_id) REFERENCES fluxion.system_failure_modes(id) ON DELETE CASCADE;


--
-- Name: system_failure_modes system_failure_modes_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_modes
    ADD CONSTRAINT system_failure_modes_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: system_failure_modes system_failure_modes_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_modes
    ADD CONSTRAINT system_failure_modes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_failure_modes system_failure_modes_failure_mode_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_modes
    ADD CONSTRAINT system_failure_modes_failure_mode_id_fkey FOREIGN KEY (failure_mode_id) REFERENCES compliance.failure_modes(id) ON DELETE CASCADE;


--
-- Name: system_failure_modes system_failure_modes_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_failure_modes
    ADD CONSTRAINT system_failure_modes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: system_obligation_evidences system_obligation_evidences_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligation_evidences
    ADD CONSTRAINT system_obligation_evidences_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE;


--
-- Name: system_obligation_evidences system_obligation_evidences_linked_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligation_evidences
    ADD CONSTRAINT system_obligation_evidences_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_obligation_evidences system_obligation_evidences_obligation_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligation_evidences
    ADD CONSTRAINT system_obligation_evidences_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES fluxion.system_obligations(id) ON DELETE CASCADE;


--
-- Name: system_obligations system_obligations_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligations
    ADD CONSTRAINT system_obligations_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: system_obligations system_obligations_classification_event_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligations
    ADD CONSTRAINT system_obligations_classification_event_id_fkey FOREIGN KEY (classification_event_id) REFERENCES fluxion.classification_events(id);


--
-- Name: system_obligations system_obligations_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligations
    ADD CONSTRAINT system_obligations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: system_obligations system_obligations_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligations
    ADD CONSTRAINT system_obligations_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_obligations system_obligations_resolved_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_obligations
    ADD CONSTRAINT system_obligations_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_report_snapshots system_report_snapshots_ai_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_report_snapshots
    ADD CONSTRAINT system_report_snapshots_ai_system_id_fkey FOREIGN KEY (ai_system_id) REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE;


--
-- Name: system_report_snapshots system_report_snapshots_generated_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_report_snapshots
    ADD CONSTRAINT system_report_snapshots_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_report_snapshots system_report_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.system_report_snapshots
    ADD CONSTRAINT system_report_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: task_activity_log task_activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_activity_log
    ADD CONSTRAINT task_activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_activity_log task_activity_log_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_activity_log
    ADD CONSTRAINT task_activity_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_uploader_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_attachments
    ADD CONSTRAINT task_attachments_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_checklist_items task_checklist_items_completed_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_checklist_items
    ADD CONSTRAINT task_checklist_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_checklist_items task_checklist_items_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_checklist_items
    ADD CONSTRAINT task_checklist_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_comments
    ADD CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE CASCADE;


--
-- Name: task_gap_links task_gap_links_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_gap_links
    ADD CONSTRAINT task_gap_links_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE CASCADE;


--
-- Name: task_recurrence_runs task_recurrence_runs_recurrence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrence_runs
    ADD CONSTRAINT task_recurrence_runs_recurrence_id_fkey FOREIGN KEY (recurrence_id) REFERENCES fluxion.task_recurrences(id) ON DELETE CASCADE;


--
-- Name: task_recurrence_runs task_recurrence_runs_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrence_runs
    ADD CONSTRAINT task_recurrence_runs_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE SET NULL;


--
-- Name: task_recurrences task_recurrences_assignee_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrences
    ADD CONSTRAINT task_recurrences_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_recurrences task_recurrences_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrences
    ADD CONSTRAINT task_recurrences_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_recurrences task_recurrences_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrences
    ADD CONSTRAINT task_recurrences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: task_recurrences task_recurrences_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrences
    ADD CONSTRAINT task_recurrences_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL;


--
-- Name: task_recurrences task_recurrences_template_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_recurrences
    ADD CONSTRAINT task_recurrences_template_id_fkey FOREIGN KEY (template_id) REFERENCES fluxion.task_templates(id) ON DELETE SET NULL;


--
-- Name: task_saved_views task_saved_views_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_saved_views
    ADD CONSTRAINT task_saved_views_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: task_saved_views task_saved_views_owner_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_saved_views
    ADD CONSTRAINT task_saved_views_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: task_templates task_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_templates
    ADD CONSTRAINT task_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_owner_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_templates
    ADD CONSTRAINT task_templates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: task_watchers task_watchers_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_watchers
    ADD CONSTRAINT task_watchers_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE CASCADE;


--
-- Name: task_watchers task_watchers_user_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.task_watchers
    ADD CONSTRAINT task_watchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES fluxion.profiles(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.tasks
    ADD CONSTRAINT tasks_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL;


--
-- Name: treatment_action_events treatment_action_events_action_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_events
    ADD CONSTRAINT treatment_action_events_action_id_fkey FOREIGN KEY (action_id) REFERENCES fluxion.treatment_actions(id) ON DELETE CASCADE;


--
-- Name: treatment_action_events treatment_action_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_events
    ADD CONSTRAINT treatment_action_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: treatment_action_events treatment_action_events_plan_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_events
    ADD CONSTRAINT treatment_action_events_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_action_reviews treatment_action_reviews_action_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_reviews
    ADD CONSTRAINT treatment_action_reviews_action_id_fkey FOREIGN KEY (action_id) REFERENCES fluxion.treatment_actions(id) ON DELETE CASCADE;


--
-- Name: treatment_action_reviews treatment_action_reviews_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_reviews
    ADD CONSTRAINT treatment_action_reviews_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: treatment_action_reviews treatment_action_reviews_plan_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_reviews
    ADD CONSTRAINT treatment_action_reviews_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_action_reviews treatment_action_reviews_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_action_reviews
    ADD CONSTRAINT treatment_action_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES fluxion.profiles(id);


--
-- Name: treatment_actions treatment_actions_control_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_control_id_fkey FOREIGN KEY (control_id) REFERENCES fluxion.controls(id);


--
-- Name: treatment_actions treatment_actions_evidence_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES fluxion.evidences(id);


--
-- Name: treatment_actions_legacy_20260417 treatment_actions_fmea_item_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions_legacy_20260417
    ADD CONSTRAINT treatment_actions_fmea_item_id_fkey FOREIGN KEY (fmea_item_id) REFERENCES fluxion.fmea_items(id) ON DELETE CASCADE;


--
-- Name: treatment_actions treatment_actions_fmea_item_id_fkey1; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_fmea_item_id_fkey1 FOREIGN KEY (fmea_item_id) REFERENCES fluxion.fmea_items(id);


--
-- Name: treatment_actions treatment_actions_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id);


--
-- Name: treatment_actions treatment_actions_plan_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_actions treatment_actions_task_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions
    ADD CONSTRAINT treatment_actions_task_id_fkey FOREIGN KEY (task_id) REFERENCES fluxion.tasks(id) ON DELETE SET NULL;


--
-- Name: treatment_actions_legacy_20260417 treatment_actions_treatment_plan_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_actions_legacy_20260417
    ADD CONSTRAINT treatment_actions_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES fluxion.treatment_plans_legacy_20260417(id) ON DELETE CASCADE;


--
-- Name: treatment_plan_snapshots treatment_plan_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plan_snapshots
    ADD CONSTRAINT treatment_plan_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: treatment_plan_snapshots treatment_plan_snapshots_plan_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plan_snapshots
    ADD CONSTRAINT treatment_plan_snapshots_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_plans_legacy_20260417 treatment_plans_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans_legacy_20260417
    ADD CONSTRAINT treatment_plans_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE;


--
-- Name: treatment_plans treatment_plans_evaluation_id_fkey1; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans
    ADD CONSTRAINT treatment_plans_evaluation_id_fkey1 FOREIGN KEY (evaluation_id) REFERENCES fluxion.fmea_evaluations(id);


--
-- Name: treatment_plans treatment_plans_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans
    ADD CONSTRAINT treatment_plans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id);


--
-- Name: treatment_plans treatment_plans_system_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.treatment_plans
    ADD CONSTRAINT treatment_plans_system_id_fkey FOREIGN KEY (system_id) REFERENCES fluxion.ai_systems(id);


--
-- Name: webhooks webhooks_created_by_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.webhooks
    ADD CONSTRAINT webhooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;


--
-- Name: webhooks webhooks_organization_id_fkey; Type: FK CONSTRAINT; Schema: fluxion; Owner: postgres
--

ALTER TABLE ONLY fluxion.webhooks
    ADD CONSTRAINT webhooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: chunks chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.chunks
    ADD CONSTRAINT chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES rag.documents(id) ON DELETE CASCADE;


--
-- Name: ingestion_jobs ingestion_jobs_document_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_document_id_fkey FOREIGN KEY (document_id) REFERENCES rag.documents(id);


--
-- Name: org_ingestion_jobs org_ingestion_jobs_document_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.org_ingestion_jobs
    ADD CONSTRAINT org_ingestion_jobs_document_id_fkey FOREIGN KEY (document_id) REFERENCES rag.organization_documents(id) ON DELETE CASCADE;


--
-- Name: org_ingestion_jobs org_ingestion_jobs_organization_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.org_ingestion_jobs
    ADD CONSTRAINT org_ingestion_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_chunks organization_chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_chunks
    ADD CONSTRAINT organization_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES rag.organization_documents(id) ON DELETE CASCADE;


--
-- Name: organization_chunks organization_chunks_organization_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_chunks
    ADD CONSTRAINT organization_chunks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_documents organization_documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: rag; Owner: postgres
--

ALTER TABLE ONLY rag.organization_documents
    ADD CONSTRAINT organization_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES fluxion.organizations(id) ON DELETE CASCADE;


--
-- Name: causal_families Permitir lectura general a causal_families; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "Permitir lectura general a causal_families" ON compliance.causal_families FOR SELECT USING (true);


--
-- Name: causal_nodes Permitir lectura general a causal_nodes; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "Permitir lectura general a causal_nodes" ON compliance.causal_nodes FOR SELECT USING (true);


--
-- Name: causal_relationships Permitir lectura general a causal_relationships; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "Permitir lectura general a causal_relationships" ON compliance.causal_relationships FOR SELECT USING (true);


--
-- Name: causal_node_failure_mode_links catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.causal_node_failure_mode_links FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: control_templates catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.control_templates FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: evidence_types catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.evidence_types FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: failure_mode_causal_relations catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.failure_mode_causal_relations FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: failure_modes catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.failure_modes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: frameworks catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.frameworks FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: obligation_evidence_types catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.obligation_evidence_types FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: obligations catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.obligations FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: requirement_control_mappings catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.requirement_control_mappings FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: requirements catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.requirements FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: risk_dimensions catálogo público para lectura autenticada; Type: POLICY; Schema: compliance; Owner: postgres
--

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.risk_dimensions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: causal_families; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.causal_families ENABLE ROW LEVEL SECURITY;

--
-- Name: causal_node_failure_mode_links; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.causal_node_failure_mode_links ENABLE ROW LEVEL SECURITY;

--
-- Name: causal_nodes; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.causal_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: causal_relationships; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.causal_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: control_templates; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.control_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_types; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.evidence_types ENABLE ROW LEVEL SECURITY;

--
-- Name: failure_mode_causal_relations; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.failure_mode_causal_relations ENABLE ROW LEVEL SECURITY;

--
-- Name: failure_modes; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.failure_modes ENABLE ROW LEVEL SECURITY;

--
-- Name: frameworks; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: obligation_evidence_types; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.obligation_evidence_types ENABLE ROW LEVEL SECURITY;

--
-- Name: obligations; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.obligations ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_control_mappings; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.requirement_control_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: requirements; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_dimensions; Type: ROW SECURITY; Schema: compliance; Owner: postgres
--

ALTER TABLE compliance.risk_dimensions ENABLE ROW LEVEL SECURITY;

--
-- Name: soa_lifecycle_log Members can read their org SoA lifecycle log; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY "Members can read their org SoA lifecycle log" ON fluxion.soa_lifecycle_log FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: agent_messages; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.agent_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_sessions; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.agent_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_system_classification_reviews; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.ai_system_classification_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_system_history; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.ai_system_history ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_system_history ai_system_history_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY ai_system_history_insert ON fluxion.ai_system_history FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_system_history ai_system_history_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY ai_system_history_select ON fluxion.ai_system_history FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_systems; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.ai_systems ENABLE ROW LEVEL SECURITY;

--
-- Name: aisia_ai_generations; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.aisia_ai_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: aisia_ai_generations aisia_ai_generations_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_ai_generations_insert ON fluxion.aisia_ai_generations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM fluxion.aisia_assessments a
  WHERE ((a.id = aisia_ai_generations.assessment_id) AND (a.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: aisia_ai_generations aisia_ai_generations_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_ai_generations_select ON fluxion.aisia_ai_generations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.aisia_assessments a
  WHERE ((a.id = aisia_ai_generations.assessment_id) AND (a.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: aisia_assessments; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.aisia_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: aisia_assessments aisia_assessments_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_assessments_delete ON fluxion.aisia_assessments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = aisia_assessments.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: aisia_assessments aisia_assessments_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_assessments_insert ON fluxion.aisia_assessments FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: aisia_assessments aisia_assessments_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_assessments_select ON fluxion.aisia_assessments FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: aisia_assessments aisia_assessments_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_assessments_update ON fluxion.aisia_assessments FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: aisia_sections; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.aisia_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: aisia_sections aisia_sections_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_sections_insert ON fluxion.aisia_sections FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM fluxion.aisia_assessments a
  WHERE ((a.id = aisia_sections.assessment_id) AND (a.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: aisia_sections aisia_sections_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_sections_select ON fluxion.aisia_sections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.aisia_assessments a
  WHERE ((a.id = aisia_sections.assessment_id) AND (a.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: aisia_sections aisia_sections_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY aisia_sections_update ON fluxion.aisia_sections FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.aisia_assessments a
  WHERE ((a.id = aisia_sections.assessment_id) AND (a.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: api_keys; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: assistant_conversations; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.assistant_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: causal_graph_instances; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.causal_graph_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: classification_diffs; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.classification_diffs ENABLE ROW LEVEL SECURITY;

--
-- Name: classification_events; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.classification_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_system_classification_reviews classification_reviews_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY classification_reviews_insert ON fluxion.ai_system_classification_reviews FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_system_classification_reviews classification_reviews_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY classification_reviews_select ON fluxion.ai_system_classification_reviews FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_system_classification_reviews classification_reviews_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY classification_reviews_update ON fluxion.ai_system_classification_reviews FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = ai_system_classification_reviews.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: committee_members; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.committee_members ENABLE ROW LEVEL SECURITY;

--
-- Name: committee_members committee_members_manage; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY committee_members_manage ON fluxion.committee_members USING (((organization_id = fluxion.auth_user_org_id()) AND (EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))));


--
-- Name: committee_members committee_members_select_org; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY committee_members_select_org ON fluxion.committee_members FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: committee_sessions; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.committee_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: committees; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.committees ENABLE ROW LEVEL SECURITY;

--
-- Name: committees committees_manage_admin; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY committees_manage_admin ON fluxion.committees USING (((organization_id = fluxion.auth_user_org_id()) AND (EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))));


--
-- Name: committees committees_select_org; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY committees_select_org ON fluxion.committees FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: controls; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.controls ENABLE ROW LEVEL SECURITY;

--
-- Name: controls controls_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY controls_delete ON fluxion.controls FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: controls controls_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY controls_insert ON fluxion.controls FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: controls controls_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY controls_select ON fluxion.controls FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: controls controls_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY controls_update ON fluxion.controls FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: evidence_controls; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.evidence_controls ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_expiry_alerts; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.evidence_expiry_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidence_expiry_alerts_insert ON fluxion.evidence_expiry_alerts FOR INSERT WITH CHECK (false);


--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidence_expiry_alerts_select ON fluxion.evidence_expiry_alerts FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: evidence_expiry_alerts evidence_expiry_alerts_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidence_expiry_alerts_update ON fluxion.evidence_expiry_alerts FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.id = auth.uid())))) WITH CHECK ((dismissed = true));


--
-- Name: system_evidence_versions evidence_versions_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidence_versions_select ON fluxion.system_evidence_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (fluxion.system_evidences se
     JOIN fluxion.profiles p ON ((p.organization_id = se.organization_id)))
  WHERE ((se.id = system_evidence_versions.evidence_id) AND (p.user_id = auth.uid())))));


--
-- Name: evidences; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.evidences ENABLE ROW LEVEL SECURITY;

--
-- Name: evidences evidences_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidences_delete ON fluxion.evidences FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: evidences evidences_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidences_insert ON fluxion.evidences FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: evidences evidences_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidences_select ON fluxion.evidences FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: evidences evidences_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY evidences_update ON fluxion.evidences FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: fmea_evaluations; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.fmea_evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: fmea_evaluations fmea_evaluations_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_evaluations_delete ON fluxion.fmea_evaluations FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: fmea_evaluations fmea_evaluations_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_evaluations_insert ON fluxion.fmea_evaluations FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role]))))));


--
-- Name: fmea_evaluations fmea_evaluations_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_evaluations_select ON fluxion.fmea_evaluations FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: fmea_evaluations fmea_evaluations_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_evaluations_update ON fluxion.fmea_evaluations FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role]))))));


--
-- Name: fmea_item_history; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.fmea_item_history ENABLE ROW LEVEL SECURITY;

--
-- Name: fmea_item_history fmea_item_history_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_item_history_insert ON fluxion.fmea_item_history FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: fmea_item_history fmea_item_history_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_item_history_select ON fluxion.fmea_item_history FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: fmea_items; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.fmea_items ENABLE ROW LEVEL SECURITY;

--
-- Name: fmea_items fmea_items_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_items_delete ON fluxion.fmea_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = fmea_items.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))))));


--
-- Name: fmea_items fmea_items_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_items_insert ON fluxion.fmea_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = fmea_items.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: fmea_items fmea_items_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_items_select ON fluxion.fmea_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = fmea_items.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: fmea_items fmea_items_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY fmea_items_update ON fluxion.fmea_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = fmea_items.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: gap_dispositions; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.gap_dispositions ENABLE ROW LEVEL SECURITY;

--
-- Name: gap_dispositions gap_dispositions_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gap_dispositions_delete ON fluxion.gap_dispositions FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: gap_dispositions gap_dispositions_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gap_dispositions_insert ON fluxion.gap_dispositions FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: gap_dispositions gap_dispositions_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gap_dispositions_select ON fluxion.gap_dispositions FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: gap_dispositions gap_dispositions_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gap_dispositions_update ON fluxion.gap_dispositions FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: gaps; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.gaps ENABLE ROW LEVEL SECURITY;

--
-- Name: gaps gaps_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gaps_delete ON fluxion.gaps FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: gaps gaps_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gaps_insert ON fluxion.gaps FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: gaps gaps_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gaps_select ON fluxion.gaps FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: gaps gaps_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY gaps_update ON fluxion.gaps FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: invitations; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations invitations_org_admin; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY invitations_org_admin ON fluxion.invitations USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: member_role_changes; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.member_role_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY notifications_select ON fluxion.notifications FOR SELECT USING ((recipient_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: notifications notifications_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY notifications_update ON fluxion.notifications FOR UPDATE USING ((recipient_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: member_role_changes org admins can insert role changes; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY "org admins can insert role changes" ON fluxion.member_role_changes FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role)))));


--
-- Name: api_keys org admins can manage api keys; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY "org admins can manage api keys" ON fluxion.api_keys USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role))))) WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role)))));


--
-- Name: webhooks org admins can manage webhooks; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY "org admins can manage webhooks" ON fluxion.webhooks USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role))))) WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role)))));


--
-- Name: audit_log org admins can read audit log; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY "org admins can read audit log" ON fluxion.audit_log FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role)))));


--
-- Name: member_role_changes org members can read role changes; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY "org members can read role changes" ON fluxion.member_role_changes FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_systems org_admin_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY org_admin_delete ON fluxion.ai_systems FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = ai_systems.organization_id) AND (profiles.role = 'org_admin'::fluxion.org_role)))));


--
-- Name: ai_systems org_editors_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY org_editors_update ON fluxion.ai_systems FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = ai_systems.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: classification_diffs org_isolation_classification_diffs; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY org_isolation_classification_diffs ON fluxion.classification_diffs USING ((organization_id = ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: classification_events org_isolation_classification_events; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY org_isolation_classification_events ON fluxion.classification_events USING ((organization_id = ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_systems org_members_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY org_members_insert ON fluxion.ai_systems FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: ai_systems org_members_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY org_members_select ON fluxion.ai_systems FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: organization_soa_controls; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.organization_soa_controls ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_soa_metadata; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.organization_soa_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_soa_system_links; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.organization_soa_system_links ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_select_member; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY organizations_select_member ON fluxion.organizations FOR SELECT USING ((id = fluxion.auth_user_org_id()));


--
-- Name: organizations organizations_update_admin; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY organizations_update_admin ON fluxion.organizations FOR UPDATE USING (((id = fluxion.auth_user_org_id()) AND (EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'org_admin'::fluxion.org_role))))));


--
-- Name: profile_systems; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.profile_systems ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_systems profile_systems_manage; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY profile_systems_manage ON fluxion.profile_systems USING (((organization_id = fluxion.auth_user_org_id()) AND (EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role])))))));


--
-- Name: profile_systems profile_systems_managers; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY profile_systems_managers ON fluxion.profile_systems FOR SELECT USING (((organization_id = fluxion.auth_user_org_id()) AND (EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))));


--
-- Name: profile_systems profile_systems_own; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY profile_systems_own ON fluxion.profile_systems FOR SELECT USING ((profile_id = ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY profiles_admin_update ON fluxion.profiles FOR UPDATE USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: profiles profiles_select_own_org; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY profiles_select_own_org ON fluxion.profiles FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY profiles_update_own ON fluxion.profiles FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: reevaluation_triggers; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.reevaluation_triggers ENABLE ROW LEVEL SECURITY;

--
-- Name: committee_sessions sessions_manage; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY sessions_manage ON fluxion.committee_sessions USING (((organization_id = fluxion.auth_user_org_id()) AND (EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))));


--
-- Name: committee_sessions sessions_select_org; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY sessions_select_org ON fluxion.committee_sessions FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: system_failure_mode_evidences sfme_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY sfme_delete ON fluxion.system_failure_mode_evidences FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.system_evidences e
  WHERE ((e.id = system_failure_mode_evidences.evidence_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: system_failure_mode_evidences sfme_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY sfme_insert ON fluxion.system_failure_mode_evidences FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM fluxion.system_evidences e
  WHERE ((e.id = system_failure_mode_evidences.evidence_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: system_failure_mode_evidences sfme_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY sfme_select ON fluxion.system_failure_mode_evidences FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.system_evidences e
  WHERE ((e.id = system_failure_mode_evidences.evidence_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: organization_soa_controls soa_controls_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_controls_delete ON fluxion.organization_soa_controls FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: organization_soa_controls soa_controls_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_controls_insert ON fluxion.organization_soa_controls FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: soa_controls_log; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.soa_controls_log ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_soa_controls soa_controls_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_controls_select ON fluxion.organization_soa_controls FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: organization_soa_controls soa_controls_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_controls_update ON fluxion.organization_soa_controls FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: soa_lifecycle_log; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.soa_lifecycle_log ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_soa_metadata soa_metadata_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_metadata_insert ON fluxion.organization_soa_metadata FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: organization_soa_metadata soa_metadata_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_metadata_select ON fluxion.organization_soa_metadata FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: organization_soa_metadata soa_metadata_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_metadata_update ON fluxion.organization_soa_metadata FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: organization_soa_system_links soa_system_links_manage; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_system_links_manage ON fluxion.organization_soa_system_links USING ((EXISTS ( SELECT 1
   FROM fluxion.organization_soa_controls c
  WHERE ((c.id = organization_soa_system_links.soa_control_id) AND (c.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role])))))))));


--
-- Name: organization_soa_system_links soa_system_links_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY soa_system_links_select ON fluxion.organization_soa_system_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.organization_soa_controls c
  WHERE ((c.id = organization_soa_system_links.soa_control_id) AND (c.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: system_evidence_versions; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_evidence_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: system_evidences; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_evidences ENABLE ROW LEVEL SECURITY;

--
-- Name: system_evidences system_evidences_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_evidences_delete ON fluxion.system_evidences FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = system_evidences.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_evidences system_evidences_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_evidences_insert ON fluxion.system_evidences FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: system_evidences system_evidences_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_evidences_select ON fluxion.system_evidences FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: system_evidences system_evidences_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_evidences_update ON fluxion.system_evidences FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = system_evidences.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_failure_mode_evidences; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_failure_mode_evidences ENABLE ROW LEVEL SECURITY;

--
-- Name: system_failure_modes; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_failure_modes ENABLE ROW LEVEL SECURITY;

--
-- Name: system_failure_modes system_failure_modes_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_failure_modes_delete ON fluxion.system_failure_modes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = system_failure_modes.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_failure_modes system_failure_modes_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_failure_modes_insert ON fluxion.system_failure_modes FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: system_failure_modes system_failure_modes_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_failure_modes_select ON fluxion.system_failure_modes FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: system_failure_modes system_failure_modes_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_failure_modes_update ON fluxion.system_failure_modes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = system_failure_modes.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_obligation_evidences; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_obligation_evidences ENABLE ROW LEVEL SECURITY;

--
-- Name: system_obligation_evidences system_obligation_evidences_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligation_evidences_delete ON fluxion.system_obligation_evidences FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (fluxion.system_obligations so
     JOIN fluxion.profiles p ON ((p.organization_id = so.organization_id)))
  WHERE ((so.id = system_obligation_evidences.obligation_id) AND (p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_obligation_evidences system_obligation_evidences_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligation_evidences_insert ON fluxion.system_obligation_evidences FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (fluxion.system_obligations so
     JOIN fluxion.profiles p ON ((p.organization_id = so.organization_id)))
  WHERE ((so.id = system_obligation_evidences.obligation_id) AND (p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_obligation_evidences system_obligation_evidences_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligation_evidences_select ON fluxion.system_obligation_evidences FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (fluxion.system_obligations so
     JOIN fluxion.profiles p ON ((p.organization_id = so.organization_id)))
  WHERE ((so.id = system_obligation_evidences.obligation_id) AND (p.user_id = auth.uid())))));


--
-- Name: system_obligations; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_obligations ENABLE ROW LEVEL SECURITY;

--
-- Name: system_obligations system_obligations_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligations_delete ON fluxion.system_obligations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = system_obligations.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_obligations system_obligations_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligations_insert ON fluxion.system_obligations FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: system_obligations system_obligations_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligations_select ON fluxion.system_obligations FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: system_obligations system_obligations_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY system_obligations_update ON fluxion.system_obligations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.organization_id = system_obligations.organization_id) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: system_report_snapshots; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.system_report_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: task_activity_log; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: task_activity_log task_activity_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_activity_select ON fluxion.task_activity_log FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_attachments; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attachments task_attachments_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_attachments_insert ON fluxion.task_attachments FOR INSERT WITH CHECK (((uploader_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) AND (task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: task_attachments task_attachments_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_attachments_select ON fluxion.task_attachments FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_attachments task_attachments_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_attachments_update ON fluxion.task_attachments FOR UPDATE USING (((uploader_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) OR (task_id IN ( SELECT t.id
   FROM (fluxion.tasks t
     JOIN fluxion.profiles p ON ((p.organization_id = t.organization_id)))
  WHERE ((p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))));


--
-- Name: task_checklist_items; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_checklist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: task_checklist_items task_checklist_items_all; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_checklist_items_all ON fluxion.task_checklist_items USING ((task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id = ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_comments; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comments task_comments_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_comments_insert ON fluxion.task_comments FOR INSERT WITH CHECK (((author_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) AND (task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: task_comments task_comments_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_comments_select ON fluxion.task_comments FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_comments task_comments_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_comments_update ON fluxion.task_comments FOR UPDATE USING ((author_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: task_gap_links; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_gap_links ENABLE ROW LEVEL SECURITY;

--
-- Name: task_gap_links task_gap_links_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_gap_links_delete ON fluxion.task_gap_links FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.tasks t
  WHERE (t.id = task_gap_links.task_id))));


--
-- Name: task_gap_links task_gap_links_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_gap_links_insert ON fluxion.task_gap_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM fluxion.tasks t
  WHERE (t.id = task_gap_links.task_id))));


--
-- Name: task_gap_links task_gap_links_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_gap_links_select ON fluxion.task_gap_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.tasks t
  WHERE (t.id = task_gap_links.task_id))));


--
-- Name: task_recurrence_runs; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_recurrence_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: task_recurrence_runs task_recurrence_runs_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_recurrence_runs_select ON fluxion.task_recurrence_runs FOR SELECT USING ((recurrence_id IN ( SELECT task_recurrences.id
   FROM fluxion.task_recurrences
  WHERE (task_recurrences.organization_id = ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_recurrences; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_recurrences ENABLE ROW LEVEL SECURITY;

--
-- Name: task_recurrences task_recurrences_all; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_recurrences_all ON fluxion.task_recurrences USING ((organization_id = ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: task_saved_views; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_saved_views ENABLE ROW LEVEL SECURITY;

--
-- Name: task_saved_views task_saved_views_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_saved_views_delete ON fluxion.task_saved_views FOR DELETE USING ((owner_id = auth.uid()));


--
-- Name: task_saved_views task_saved_views_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_saved_views_insert ON fluxion.task_saved_views FOR INSERT WITH CHECK (((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) AND (owner_id = auth.uid())));


--
-- Name: task_saved_views task_saved_views_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_saved_views_select ON fluxion.task_saved_views FOR SELECT USING (((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) AND ((scope = 'shared'::text) OR (owner_id = auth.uid()))));


--
-- Name: task_saved_views task_saved_views_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_saved_views_update ON fluxion.task_saved_views FOR UPDATE USING ((owner_id = auth.uid()));


--
-- Name: task_templates; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: task_templates task_templates_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_templates_delete ON fluxion.task_templates FOR DELETE USING ((owner_id = ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: task_templates task_templates_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_templates_insert ON fluxion.task_templates FOR INSERT WITH CHECK (((scope = ANY (ARRAY['personal'::text, 'shared'::text])) AND (organization_id = ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) AND (owner_id = ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid())))));


--
-- Name: task_templates task_templates_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_templates_select ON fluxion.task_templates FOR SELECT USING (((scope = 'system'::text) OR ((is_archived = false) AND (organization_id = ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_templates task_templates_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_templates_update ON fluxion.task_templates FOR UPDATE USING ((owner_id = ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid())))) WITH CHECK ((owner_id = ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: task_watchers; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.task_watchers ENABLE ROW LEVEL SECURITY;

--
-- Name: task_watchers task_watchers_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_watchers_delete ON fluxion.task_watchers FOR DELETE USING (((user_id IN ( SELECT profiles.id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))) OR (task_id IN ( SELECT t.id
   FROM (fluxion.tasks t
     JOIN fluxion.profiles p ON ((p.organization_id = t.organization_id)))
  WHERE ((p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))));


--
-- Name: task_watchers task_watchers_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_watchers_insert ON fluxion.task_watchers FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: task_watchers task_watchers_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY task_watchers_select ON fluxion.task_watchers FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM fluxion.tasks
  WHERE (tasks.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: tasks; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY tasks_delete ON fluxion.tasks FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role]))))));


--
-- Name: tasks tasks_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY tasks_insert ON fluxion.tasks FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: tasks tasks_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY tasks_select ON fluxion.tasks FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: tasks tasks_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY tasks_update ON fluxion.tasks FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'system_owner'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]))))));


--
-- Name: treatment_action_events; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_action_events ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_action_events treatment_action_events_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_action_events_insert ON fluxion.treatment_action_events FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: treatment_action_events treatment_action_events_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_action_events_select ON fluxion.treatment_action_events FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: treatment_action_reviews; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_action_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_action_reviews treatment_action_reviews_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_action_reviews_insert ON fluxion.treatment_action_reviews FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: treatment_action_reviews treatment_action_reviews_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_action_reviews_select ON fluxion.treatment_action_reviews FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: treatment_actions; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_actions treatment_actions_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_actions_delete ON fluxion.treatment_actions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (fluxion.treatment_plans tp
     JOIN fluxion.fmea_evaluations e ON ((e.id = tp.evaluation_id)))
  WHERE ((tp.id = treatment_actions.plan_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))))));


--
-- Name: treatment_actions treatment_actions_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_actions_insert ON fluxion.treatment_actions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (fluxion.treatment_plans tp
     JOIN fluxion.fmea_evaluations e ON ((e.id = tp.evaluation_id)))
  WHERE ((tp.id = treatment_actions.plan_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: treatment_actions_legacy_20260417; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_actions_legacy_20260417 ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_actions treatment_actions_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_actions_select ON fluxion.treatment_actions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (fluxion.treatment_plans tp
     JOIN fluxion.fmea_evaluations e ON ((e.id = tp.evaluation_id)))
  WHERE ((tp.id = treatment_actions.plan_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: treatment_actions treatment_actions_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_actions_update ON fluxion.treatment_actions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (fluxion.treatment_plans tp
     JOIN fluxion.fmea_evaluations e ON ((e.id = tp.evaluation_id)))
  WHERE ((tp.id = treatment_actions.plan_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: treatment_plan_snapshots; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_plan_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_plan_snapshots treatment_plan_snapshots_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_plan_snapshots_insert ON fluxion.treatment_plan_snapshots FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: treatment_plan_snapshots treatment_plan_snapshots_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_plan_snapshots_select ON fluxion.treatment_plan_snapshots FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM fluxion.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: treatment_plans; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_plans treatment_plans_delete; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_plans_delete ON fluxion.treatment_plans FOR DELETE USING ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = treatment_plans.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role])))))))));


--
-- Name: treatment_plans treatment_plans_insert; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_plans_insert ON fluxion.treatment_plans FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = treatment_plans.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: treatment_plans_legacy_20260417; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.treatment_plans_legacy_20260417 ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_plans treatment_plans_select; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_plans_select ON fluxion.treatment_plans FOR SELECT USING ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = treatment_plans.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE (profiles.user_id = auth.uid())))))));


--
-- Name: treatment_plans treatment_plans_update; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY treatment_plans_update ON fluxion.treatment_plans FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM fluxion.fmea_evaluations e
  WHERE ((e.id = treatment_plans.evaluation_id) AND (e.organization_id IN ( SELECT profiles.organization_id
           FROM fluxion.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role, 'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role, 'system_owner'::fluxion.org_role])))))))));


--
-- Name: assistant_conversations user_own_conversations; Type: POLICY; Schema: fluxion; Owner: postgres
--

CREATE POLICY user_own_conversations ON fluxion.assistant_conversations TO authenticated USING ((user_id = auth.uid()));


--
-- Name: webhooks; Type: ROW SECURITY; Schema: fluxion; Owner: postgres
--

ALTER TABLE fluxion.webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: chunks; Type: ROW SECURITY; Schema: rag; Owner: postgres
--

ALTER TABLE rag.chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: rag; Owner: postgres
--

ALTER TABLE rag.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: org_ingestion_jobs; Type: ROW SECURITY; Schema: rag; Owner: postgres
--

ALTER TABLE rag.org_ingestion_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_chunks; Type: ROW SECURITY; Schema: rag; Owner: postgres
--

ALTER TABLE rag.organization_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_documents; Type: ROW SECURITY; Schema: rag; Owner: postgres
--

ALTER TABLE rag.organization_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents rag_documents_global_read; Type: POLICY; Schema: rag; Owner: postgres
--

CREATE POLICY rag_documents_global_read ON rag.documents FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: organization_chunks rag_org_chunks_select; Type: POLICY; Schema: rag; Owner: postgres
--

CREATE POLICY rag_org_chunks_select ON rag.organization_chunks FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: organization_documents rag_org_documents_select; Type: POLICY; Schema: rag; Owner: postgres
--

CREATE POLICY rag_org_documents_select ON rag.organization_documents FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: org_ingestion_jobs rag_org_ingestion_jobs_select; Type: POLICY; Schema: rag; Owner: postgres
--

CREATE POLICY rag_org_ingestion_jobs_select ON rag.org_ingestion_jobs FOR SELECT USING ((organization_id = fluxion.auth_user_org_id()));


--
-- Name: SCHEMA compliance; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA compliance TO authenticated;
GRANT USAGE ON SCHEMA compliance TO service_role;


--
-- Name: SCHEMA fluxion; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT USAGE ON SCHEMA fluxion TO service_role;


--
-- Name: SCHEMA rag; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA rag TO authenticated;
GRANT USAGE ON SCHEMA rag TO service_role;


--
-- Name: FUNCTION action_status_to_task_status(p_action_status fluxion.treatment_action_status); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.action_status_to_task_status(p_action_status fluxion.treatment_action_status) TO authenticated;
GRANT ALL ON FUNCTION fluxion.action_status_to_task_status(p_action_status fluxion.treatment_action_status) TO service_role;


--
-- Name: FUNCTION auth_user_org_id(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.auth_user_org_id() TO authenticated;
GRANT ALL ON FUNCTION fluxion.auth_user_org_id() TO service_role;


--
-- Name: FUNCTION calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean) TO authenticated;
GRANT ALL ON FUNCTION fluxion.calculate_failure_mode_priority(p_s_default smallint, p_dimension text, p_w numeric, p_aiact_risk_level text, p_affects_persons boolean, p_has_minors boolean, p_vulnerable_groups boolean, p_biometric boolean, p_domain text, p_critical_infra boolean, p_is_gpai boolean, p_output_type text, p_ai_system_type text, p_has_external_tools boolean) TO service_role;


--
-- Name: FUNCTION check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text) TO authenticated;
GRANT ALL ON FUNCTION fluxion.check_priority_status_change_authorization(p_from_status fluxion.priority_status, p_to_status fluxion.priority_status, p_priority_notes text, p_s_default smallint, p_dimension text, p_aiact_risk_level text, p_has_minors boolean, p_biometric boolean, p_vulnerable_groups boolean, p_user_role text) TO service_role;


--
-- Name: FUNCTION compute_next_run(p_frequency text, p_day_of_week integer, p_day_of_month integer, p_month_of_year integer, p_from timestamp with time zone); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.compute_next_run(p_frequency text, p_day_of_week integer, p_day_of_month integer, p_month_of_year integer, p_from timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION fluxion.compute_next_run(p_frequency text, p_day_of_week integer, p_day_of_month integer, p_month_of_year integer, p_from timestamp with time zone) TO service_role;


--
-- Name: FUNCTION current_organization_id(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.current_organization_id() TO authenticated;
GRANT ALL ON FUNCTION fluxion.current_organization_id() TO service_role;


--
-- Name: FUNCTION expire_invitations(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.expire_invitations() TO authenticated;
GRANT ALL ON FUNCTION fluxion.expire_invitations() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION fluxion.handle_new_user() TO service_role;


--
-- Name: FUNCTION init_recurrence_next_run(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.init_recurrence_next_run() TO authenticated;
GRANT ALL ON FUNCTION fluxion.init_recurrence_next_run() TO service_role;


--
-- Name: FUNCTION process_task_recurrences(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.process_task_recurrences() TO authenticated;
GRANT ALL ON FUNCTION fluxion.process_task_recurrences() TO service_role;


--
-- Name: FUNCTION recalculate_plan_zone_target(p_plan_id uuid); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid) TO authenticated;
GRANT ALL ON FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid) TO service_role;


--
-- Name: FUNCTION s_actual_to_task_priority(p_s_actual smallint); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.s_actual_to_task_priority(p_s_actual smallint) TO authenticated;
GRANT ALL ON FUNCTION fluxion.s_actual_to_task_priority(p_s_actual smallint) TO service_role;


--
-- Name: FUNCTION set_session_number(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.set_session_number() TO authenticated;
GRANT ALL ON FUNCTION fluxion.set_session_number() TO service_role;


--
-- Name: FUNCTION set_task_checklist_updated_at(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.set_task_checklist_updated_at() TO authenticated;
GRANT ALL ON FUNCTION fluxion.set_task_checklist_updated_at() TO service_role;


--
-- Name: FUNCTION set_task_recurrences_updated_at(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.set_task_recurrences_updated_at() TO authenticated;
GRANT ALL ON FUNCTION fluxion.set_task_recurrences_updated_at() TO service_role;


--
-- Name: FUNCTION set_task_templates_updated_at(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.set_task_templates_updated_at() TO authenticated;
GRANT ALL ON FUNCTION fluxion.set_task_templates_updated_at() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION fluxion.set_updated_at() TO service_role;


--
-- Name: FUNCTION trg_task_done_propagate(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.trg_task_done_propagate() TO authenticated;
GRANT ALL ON FUNCTION fluxion.trg_task_done_propagate() TO service_role;


--
-- Name: FUNCTION trg_treatment_action_create_task(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.trg_treatment_action_create_task() TO authenticated;
GRANT ALL ON FUNCTION fluxion.trg_treatment_action_create_task() TO service_role;


--
-- Name: FUNCTION trg_treatment_action_sync_task(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.trg_treatment_action_sync_task() TO authenticated;
GRANT ALL ON FUNCTION fluxion.trg_treatment_action_sync_task() TO service_role;


--
-- Name: FUNCTION trigger_evidence_closes_action(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.trigger_evidence_closes_action() TO authenticated;
GRANT ALL ON FUNCTION fluxion.trigger_evidence_closes_action() TO service_role;


--
-- Name: FUNCTION trigger_update_plan_zone_target(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.trigger_update_plan_zone_target() TO authenticated;
GRANT ALL ON FUNCTION fluxion.trigger_update_plan_zone_target() TO service_role;


--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT ALL ON FUNCTION fluxion.update_updated_at() TO authenticated;
GRANT ALL ON FUNCTION fluxion.update_updated_at() TO service_role;


--
-- Name: FUNCTION search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, filter_metadata jsonb, filter_short_name text); Type: ACL; Schema: rag; Owner: postgres
--

GRANT ALL ON FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, filter_metadata jsonb, filter_short_name text) TO authenticated;
GRANT ALL ON FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, filter_metadata jsonb, filter_short_name text) TO service_role;


--
-- Name: FUNCTION search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, org_id uuid, filter_metadata jsonb, filter_short_name text); Type: ACL; Schema: rag; Owner: postgres
--

GRANT ALL ON FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, org_id uuid, filter_metadata jsonb, filter_short_name text) TO authenticated;
GRANT ALL ON FUNCTION rag.search_chunks(query_embedding public.vector, source_types rag.source_type[], match_count integer, match_threshold double precision, org_id uuid, filter_metadata jsonb, filter_short_name text) TO service_role;


--
-- Name: FUNCTION search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer, semantic_weight double precision, org_id uuid, filter_short_name text); Type: ACL; Schema: rag; Owner: postgres
--

GRANT ALL ON FUNCTION rag.search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer, semantic_weight double precision, org_id uuid, filter_short_name text) TO authenticated;
GRANT ALL ON FUNCTION rag.search_chunks_hybrid(query_text text, query_embedding public.vector, source_types rag.source_type[], match_count integer, semantic_weight double precision, org_id uuid, filter_short_name text) TO service_role;


--
-- Name: TABLE causal_families; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_families TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_families TO service_role;


--
-- Name: TABLE causal_node_failure_mode_links; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_node_failure_mode_links TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_node_failure_mode_links TO service_role;


--
-- Name: TABLE causal_nodes; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_nodes TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_nodes TO service_role;


--
-- Name: TABLE causal_relationships; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_relationships TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.causal_relationships TO service_role;


--
-- Name: TABLE control_templates; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.control_templates TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.control_templates TO service_role;


--
-- Name: TABLE evidence_types; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.evidence_types TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.evidence_types TO service_role;


--
-- Name: TABLE failure_mode_causal_relations; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.failure_mode_causal_relations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.failure_mode_causal_relations TO service_role;


--
-- Name: TABLE failure_mode_control_refs; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.failure_mode_control_refs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.failure_mode_control_refs TO service_role;


--
-- Name: TABLE failure_modes; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.failure_modes TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.failure_modes TO service_role;


--
-- Name: TABLE frameworks; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.frameworks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.frameworks TO service_role;


--
-- Name: TABLE obligation_evidence_types; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.obligation_evidence_types TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.obligation_evidence_types TO service_role;


--
-- Name: TABLE obligations; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.obligations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.obligations TO service_role;


--
-- Name: TABLE requirement_control_mappings; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.requirement_control_mappings TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.requirement_control_mappings TO service_role;


--
-- Name: TABLE requirements; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.requirements TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.requirements TO service_role;


--
-- Name: TABLE risk_dimensions; Type: ACL; Schema: compliance; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.risk_dimensions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE compliance.risk_dimensions TO service_role;


--
-- Name: TABLE agent_messages; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.agent_messages TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.agent_messages TO service_role;


--
-- Name: TABLE agent_sessions; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.agent_sessions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.agent_sessions TO service_role;


--
-- Name: TABLE ai_system_classification_reviews; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.ai_system_classification_reviews TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.ai_system_classification_reviews TO service_role;


--
-- Name: TABLE ai_system_history; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.ai_system_history TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.ai_system_history TO service_role;


--
-- Name: TABLE ai_systems; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.ai_systems TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.ai_systems TO service_role;


--
-- Name: TABLE aisia_ai_generations; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.aisia_ai_generations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.aisia_ai_generations TO service_role;


--
-- Name: TABLE aisia_assessments; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.aisia_assessments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.aisia_assessments TO service_role;


--
-- Name: TABLE aisia_sections; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.aisia_sections TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.aisia_sections TO service_role;


--
-- Name: TABLE api_keys; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.api_keys TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.api_keys TO service_role;


--
-- Name: TABLE assistant_conversations; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.assistant_conversations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.assistant_conversations TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.audit_log TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.audit_log TO service_role;


--
-- Name: TABLE causal_graph_instances; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.causal_graph_instances TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.causal_graph_instances TO service_role;


--
-- Name: TABLE classification_diffs; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.classification_diffs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.classification_diffs TO service_role;


--
-- Name: TABLE classification_events; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.classification_events TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.classification_events TO service_role;


--
-- Name: TABLE committee_members; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.committee_members TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.committee_members TO service_role;


--
-- Name: TABLE committee_sessions; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.committee_sessions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.committee_sessions TO service_role;


--
-- Name: TABLE committees; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.committees TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.committees TO service_role;


--
-- Name: TABLE controls; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.controls TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.controls TO service_role;


--
-- Name: TABLE evidence_controls; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.evidence_controls TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.evidence_controls TO service_role;


--
-- Name: TABLE evidence_expiry_alerts; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.evidence_expiry_alerts TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.evidence_expiry_alerts TO service_role;


--
-- Name: TABLE evidences; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.evidences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.evidences TO service_role;


--
-- Name: TABLE system_failure_modes; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_failure_modes TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_failure_modes TO service_role;


--
-- Name: TABLE failure_mode_priority_diagnostic_detail; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.failure_mode_priority_diagnostic_detail TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.failure_mode_priority_diagnostic_detail TO service_role;


--
-- Name: TABLE failure_mode_priority_diagnostic_families; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.failure_mode_priority_diagnostic_families TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.failure_mode_priority_diagnostic_families TO service_role;


--
-- Name: TABLE failure_mode_priority_diagnostic_summary; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.failure_mode_priority_diagnostic_summary TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.failure_mode_priority_diagnostic_summary TO service_role;


--
-- Name: TABLE fmea_evaluations; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.fmea_evaluations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.fmea_evaluations TO service_role;


--
-- Name: TABLE fmea_item_history; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.fmea_item_history TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.fmea_item_history TO service_role;


--
-- Name: TABLE fmea_items; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.fmea_items TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.fmea_items TO service_role;


--
-- Name: TABLE gap_dispositions; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.gap_dispositions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.gap_dispositions TO service_role;


--
-- Name: TABLE gaps; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.gaps TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.gaps TO service_role;


--
-- Name: TABLE invitations; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.invitations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.invitations TO service_role;


--
-- Name: TABLE member_role_changes; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.member_role_changes TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.member_role_changes TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.notifications TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.notifications TO service_role;


--
-- Name: TABLE organization_soa_controls; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organization_soa_controls TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organization_soa_controls TO service_role;


--
-- Name: TABLE organization_soa_metadata; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organization_soa_metadata TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organization_soa_metadata TO service_role;


--
-- Name: TABLE organization_soa_system_links; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organization_soa_system_links TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organization_soa_system_links TO service_role;


--
-- Name: TABLE organizations; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organizations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.organizations TO service_role;


--
-- Name: TABLE treatment_plans; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_plans TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_plans TO service_role;


--
-- Name: TABLE plan_summary; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.plan_summary TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.plan_summary TO service_role;


--
-- Name: TABLE profile_systems; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.profile_systems TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.profile_systems TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.profiles TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.profiles TO service_role;


--
-- Name: TABLE reevaluation_triggers; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.reevaluation_triggers TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.reevaluation_triggers TO service_role;


--
-- Name: TABLE soa_controls_log; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.soa_controls_log TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.soa_controls_log TO service_role;


--
-- Name: TABLE soa_lifecycle_log; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.soa_lifecycle_log TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.soa_lifecycle_log TO service_role;


--
-- Name: TABLE system_evidence_versions; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_evidence_versions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_evidence_versions TO service_role;


--
-- Name: TABLE system_evidences; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_evidences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_evidences TO service_role;


--
-- Name: TABLE system_failure_mode_evidences; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_failure_mode_evidences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_failure_mode_evidences TO service_role;


--
-- Name: TABLE system_obligation_evidences; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_obligation_evidences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_obligation_evidences TO service_role;


--
-- Name: TABLE system_obligations; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_obligations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_obligations TO service_role;


--
-- Name: TABLE system_report_snapshots; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_report_snapshots TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.system_report_snapshots TO service_role;


--
-- Name: TABLE task_activity_log; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_activity_log TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_activity_log TO service_role;


--
-- Name: TABLE task_attachments; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_attachments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_attachments TO service_role;


--
-- Name: TABLE task_checklist_items; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_checklist_items TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_checklist_items TO service_role;


--
-- Name: TABLE task_comments; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_comments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_comments TO service_role;


--
-- Name: TABLE task_gap_links; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_gap_links TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_gap_links TO service_role;


--
-- Name: TABLE task_recurrence_runs; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_recurrence_runs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_recurrence_runs TO service_role;


--
-- Name: TABLE task_recurrences; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_recurrences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_recurrences TO service_role;


--
-- Name: TABLE task_saved_views; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_saved_views TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_saved_views TO service_role;


--
-- Name: TABLE task_templates; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_templates TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_templates TO service_role;


--
-- Name: TABLE task_watchers; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_watchers TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.task_watchers TO service_role;


--
-- Name: TABLE tasks; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.tasks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.tasks TO service_role;


--
-- Name: TABLE treatment_action_events; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_action_events TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_action_events TO service_role;


--
-- Name: TABLE treatment_action_reviews; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_action_reviews TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_action_reviews TO service_role;


--
-- Name: TABLE treatment_actions; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_actions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_actions TO service_role;


--
-- Name: TABLE treatment_actions_legacy_20260417; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_actions_legacy_20260417 TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_actions_legacy_20260417 TO service_role;


--
-- Name: TABLE treatment_actions_pending_review; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_actions_pending_review TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_actions_pending_review TO service_role;


--
-- Name: TABLE treatment_plan_snapshots; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_plan_snapshots TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_plan_snapshots TO service_role;


--
-- Name: TABLE treatment_plans_legacy_20260417; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_plans_legacy_20260417 TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.treatment_plans_legacy_20260417 TO service_role;


--
-- Name: TABLE webhooks; Type: ACL; Schema: fluxion; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.webhooks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE fluxion.webhooks TO service_role;


--
-- Name: TABLE chunks; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.chunks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.chunks TO service_role;


--
-- Name: TABLE documents; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.documents TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.documents TO service_role;


--
-- Name: TABLE corpus_status; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.corpus_status TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.corpus_status TO service_role;


--
-- Name: TABLE ingestion_jobs; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.ingestion_jobs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.ingestion_jobs TO service_role;


--
-- Name: TABLE organization_chunks; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.organization_chunks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.organization_chunks TO service_role;


--
-- Name: TABLE organization_documents; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.organization_documents TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.organization_documents TO service_role;


--
-- Name: TABLE org_corpus_status; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.org_corpus_status TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.org_corpus_status TO service_role;


--
-- Name: TABLE org_ingestion_jobs; Type: ACL; Schema: rag; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.org_ingestion_jobs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE rag.org_ingestion_jobs TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: compliance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA compliance GRANT SELECT,USAGE ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA compliance GRANT SELECT,USAGE ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: compliance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA compliance GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA compliance GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: compliance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA compliance GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA compliance GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: fluxion; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fluxion GRANT SELECT,USAGE ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fluxion GRANT SELECT,USAGE ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: fluxion; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fluxion GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fluxion GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: fluxion; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fluxion GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fluxion GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: rag; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rag GRANT SELECT,USAGE ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rag GRANT SELECT,USAGE ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: rag; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rag GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rag GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: rag; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rag GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rag GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

