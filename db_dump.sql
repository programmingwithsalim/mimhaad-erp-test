--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: agency_transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agency_transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'reversed',
    'received',
    'settled',
    'complete'
);


--
-- Name: agency_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agency_transaction_type AS ENUM (
    'deposit',
    'withdrawal',
    'interbank_transfer',
    'commission'
);


--
-- Name: batch_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.batch_status AS ENUM (
    'received',
    'in_use',
    'depleted',
    'expired'
);


--
-- Name: card_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.card_status AS ENUM (
    'active',
    'inactive',
    'blocked',
    'expired'
);


--
-- Name: reversal_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reversal_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);


--
-- Name: transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'reversed',
    'received',
    'settled',
    'complete'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'card_issuance',
    'withdrawal',
    'balance_inquiry',
    'pin_change'
);


--
-- Name: update_batch_quantity_on_issuance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_batch_quantity_on_issuance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          -- Increment quantity_issued in the batch
          UPDATE ezwich_card_batches 
          SET quantity_issued = quantity_issued + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.batch_id;
          
          -- Update batch status if depleted
          UPDATE ezwich_card_batches 
          SET status = 'depleted'
          WHERE id = NEW.batch_id 
          AND quantity_issued >= quantity_received;
          
          RETURN NEW;
      END;
      $$;


--
-- Name: update_momo_transactions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_momo_transactions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


--
-- Name: update_power_transactions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_power_transactions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


--
-- Name: update_stock_movements_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stock_movements_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_user_notification_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_notification_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users_sync; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.users_sync (
    raw_json jsonb NOT NULL,
    id text GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED NOT NULL,
    name text GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
    email text GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: agency_banking_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_banking_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.agency_transaction_type NOT NULL,
    amount numeric(15,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0 NOT NULL,
    customer_name character varying(255) NOT NULL,
    account_number character varying(50) NOT NULL,
    partner_bank character varying(100) NOT NULL,
    partner_bank_code character varying(20) NOT NULL,
    partner_bank_id character varying(50) NOT NULL,
    reference text,
    status public.agency_transaction_status DEFAULT 'pending'::public.agency_transaction_status NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    cash_till_affected numeric(15,2) DEFAULT 0 NOT NULL,
    float_affected numeric(15,2) DEFAULT 0 NOT NULL,
    gl_entry_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb,
    deleted boolean DEFAULT false,
    original_transaction_id uuid,
    is_reversal boolean DEFAULT false,
    notes text
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id uuid,
    username character varying(255) NOT NULL,
    action_type character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(255),
    description text NOT NULL,
    details jsonb,
    ip_address inet,
    user_agent text,
    severity character varying(20) DEFAULT 'low'::character varying,
    branch_id uuid,
    branch_name character varying(255),
    status character varying(20) DEFAULT 'success'::character varying,
    error_message text,
    related_entities jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    action character varying,
    CONSTRAINT audit_logs_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT audit_logs_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failure'::character varying])::text[])))
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    location character varying(255) NOT NULL,
    region character varying(100) NOT NULL,
    manager character varying(255) NOT NULL,
    contact_phone character varying(50),
    email character varying(255),
    staff_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    address text,
    phone character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source character varying(50) NOT NULL,
    source_name character varying(255) NOT NULL,
    amount numeric(15,2) DEFAULT 0.00 NOT NULL,
    month date NOT NULL,
    reference character varying(255) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    gl_account character varying(20),
    gl_account_name character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by_name character varying(255) NOT NULL,
    updated_by_id uuid,
    updated_by_name character varying(255),
    branch_id uuid,
    branch_name character varying(255),
    transaction_volume integer DEFAULT 0,
    commission_rate numeric(10,4) DEFAULT 0.0000,
    receipt_path character varying(500),
    notes character varying(255),
    created_by uuid,
    receipt_filename character varying(255),
    receipt_size character varying,
    receipt_type character varying,
    receipt_data character varying,
    is_reversal boolean DEFAULT false,
    original_transaction_id uuid,
    CONSTRAINT commissions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'paid'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: e_zwich_card_issuances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.e_zwich_card_issuances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_number character varying(11) NOT NULL,
    partner_bank character varying(50) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(20) NOT NULL,
    customer_email character varying(255),
    date_of_birth date NOT NULL,
    gender character varying(10) NOT NULL,
    address_line1 text NOT NULL,
    id_type character varying(20) NOT NULL,
    id_number character varying(50) NOT NULL,
    fee_charged numeric(10,2) DEFAULT 15.00 NOT NULL,
    payment_method character varying(20) NOT NULL,
    reference text,
    branch_id uuid NOT NULL,
    issued_by uuid NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    customer_photo text,
    id_photo text,
    pin_hash character varying(255),
    card_status character varying(20) DEFAULT 'active'::character varying,
    issue_date date DEFAULT CURRENT_DATE,
    id_expiry_date date DEFAULT (CURRENT_DATE + '3 years'::interval),
    address_line2 character varying(255),
    city character varying(255),
    region character varying(255),
    postal_code character varying(10),
    user_id uuid,
    processed_by character varying(255),
    username character varying(100),
    is_reversal boolean DEFAULT false,
    original_transaction_id uuid,
    fee numeric DEFAULT 0 NOT NULL,
    CONSTRAINT e_zwich_card_issuances_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT e_zwich_card_issuances_id_type_check CHECK (((id_type)::text = ANY ((ARRAY['ghana_card'::character varying, 'voters_id'::character varying, 'passport'::character varying, 'drivers_license'::character varying])::text[]))),
    CONSTRAINT e_zwich_card_issuances_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'momo'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT e_zwich_card_issuances_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: e_zwich_partner_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.e_zwich_partner_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    bank_name character varying(100) NOT NULL,
    account_number character varying(20) NOT NULL,
    account_name character varying(100) NOT NULL,
    contact_person character varying(100) NOT NULL,
    contact_phone character varying(20) NOT NULL,
    contact_email character varying(100),
    settlement_time time without time zone DEFAULT '17:00:00'::time without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: e_zwich_withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.e_zwich_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_reference character varying(50),
    card_number character varying(20) NOT NULL,
    customer_name character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0,
    total_amount numeric(12,2) GENERATED ALWAYS AS ((amount + fee)) STORED,
    partner_bank character varying(100) NOT NULL,
    customer_phone character varying(20),
    branch_id uuid NOT NULL,
    ezwich_settlement_account_id uuid,
    status character varying(20) DEFAULT 'completed'::character varying,
    transaction_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reference text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    settlement_account_id uuid,
    notes text,
    user_id uuid,
    processed_by character varying(255),
    original_transaction_id uuid,
    is_reversal boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    branch_name character varying
);


--
-- Name: expense_heads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_heads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    gl_account_code character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    branch_id uuid
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_number character varying(50) NOT NULL,
    branch_id uuid NOT NULL,
    expense_head_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    expense_date date NOT NULL,
    payment_source character varying(50) NOT NULL,
    payment_account_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    paid_by uuid,
    paid_at timestamp with time zone,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    gl_journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    comments character varying(255),
    notes character varying(255),
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_reversal boolean DEFAULT false,
    original_transaction_id uuid,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expenses_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'paid'::character varying])::text[])))
);


--
-- Name: ezwich_card_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ezwich_card_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_code character varying(50) NOT NULL,
    quantity_received integer NOT NULL,
    quantity_issued integer DEFAULT 0,
    card_type character varying(50) DEFAULT 'standard'::character varying,
    expiry_date date,
    status public.batch_status DEFAULT 'received'::public.batch_status,
    branch_id uuid NOT NULL,
    created_by uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    quantity_available integer GENERATED ALWAYS AS ((quantity_received - quantity_issued)) STORED,
    unit_cost double precision,
    total_cost double precision,
    partner_bank_id uuid,
    partner_bank_name character varying,
    branch_name character varying,
    CONSTRAINT chk_quantity_issued_not_exceed_received CHECK ((quantity_issued <= quantity_received)),
    CONSTRAINT ezwich_card_batches_quantity_issued_check CHECK ((quantity_issued >= 0)),
    CONSTRAINT ezwich_card_batches_quantity_received_check CHECK ((quantity_received > 0))
);


--
-- Name: ezwich_card_issuance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ezwich_card_issuance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_number character varying(20) NOT NULL,
    batch_id uuid,
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(20) NOT NULL,
    customer_email character varying(255),
    date_of_birth date,
    gender character varying(10),
    id_type character varying(50),
    id_number character varying(50),
    id_expiry_date date,
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    region character varying(100),
    postal_code character varying(20),
    country character varying(100) DEFAULT 'Ghana'::character varying,
    card_status character varying(20) DEFAULT 'active'::character varying,
    issue_date date DEFAULT CURRENT_DATE,
    expiry_date date,
    branch_id uuid NOT NULL,
    issued_by uuid NOT NULL,
    fee_charged numeric(10,2) DEFAULT 15.00,
    customer_photo text,
    id_front_image text,
    id_back_image text,
    payment_method character varying(50),
    partner_bank character varying(100),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ezwich_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ezwich_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_number character varying(20) NOT NULL,
    batch_id uuid,
    customer_name character varying(100) NOT NULL,
    customer_phone character varying(15) NOT NULL,
    customer_email character varying(100),
    date_of_birth date,
    gender character varying(10),
    id_type character varying(20),
    id_number character varying(50),
    id_expiry_date date,
    address_line1 text,
    address_line2 text,
    city character varying(50),
    region character varying(50),
    postal_code character varying(10),
    country character varying(50) DEFAULT 'Ghana'::character varying,
    card_status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    issue_date date NOT NULL,
    expiry_date date,
    branch_id character varying(50) NOT NULL,
    issued_by character varying(255) NOT NULL,
    fee_charged numeric(10,2) DEFAULT 15.0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ezwich_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ezwich_transactions (
    id character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    amount numeric(10,2),
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(20),
    card_number character varying(50),
    partner_bank character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying,
    branch_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    settlement_account_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fee double precision
);


--
-- Name: fee_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_config (
    id integer NOT NULL,
    service_type character varying(50) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    fee_type character varying(20) DEFAULT 'percentage'::character varying,
    fee_value numeric(10,4) NOT NULL,
    minimum_fee numeric(10,2) DEFAULT 0,
    maximum_fee numeric(10,2),
    currency character varying(3) DEFAULT 'GHS'::character varying,
    tier_min_amount numeric(15,2) DEFAULT 0,
    tier_max_amount numeric(15,2),
    is_active boolean DEFAULT true,
    effective_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    updated_by character varying(255),
    CONSTRAINT fee_config_fee_type_check CHECK (((fee_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[])))
);


--
-- Name: fee_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_config_id_seq OWNED BY public.fee_config.id;


--
-- Name: float_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.float_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    account_type character varying(50) NOT NULL,
    provider character varying(100),
    account_number character varying(100),
    current_balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    min_threshold numeric(15,2) DEFAULT 0.00 NOT NULL,
    max_threshold numeric(15,2) DEFAULT 0.00 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    isezwichpartner boolean DEFAULT false,
    notes text,
    account_name character varying(255),
    CONSTRAINT valid_account_type CHECK (((account_type)::text = ANY ((ARRAY['cash-in-till'::character varying, 'e-zwich'::character varying, 'power'::character varying, 'momo'::character varying, 'agency-banking'::character varying, 'jumia'::character varying])::text[]))),
    CONSTRAINT valid_balance CHECK ((current_balance >= (0)::numeric)),
    CONSTRAINT valid_thresholds CHECK (((min_threshold >= (0)::numeric) AND (max_threshold >= min_threshold)))
);


--
-- Name: float_accounts_with_branch; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.float_accounts_with_branch AS
 SELECT fa.id,
    fa.branch_id,
    fa.account_type,
    fa.provider,
    fa.account_number,
    fa.current_balance,
    fa.min_threshold,
    fa.max_threshold,
    fa.is_active,
    fa.created_by,
    fa.created_at,
    fa.updated_at,
    fa.last_updated,
    b.name AS branch_name,
    b.code AS branch_code,
    b.location AS branch_location,
    b.region AS branch_region
   FROM (public.float_accounts fa
     JOIN public.branches b ON ((fa.branch_id = b.id)));


--
-- Name: float_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.float_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    transaction_type character varying(50),
    amount numeric(15,2),
    description text,
    reference character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    balance_before numeric(15,2),
    balance_after numeric(15,2),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    branch_id uuid,
    processed_by character varying(255),
    user_id character varying(255),
    status character varying(20) DEFAULT 'completed'::character varying,
    float_account_id uuid,
    reference_id character varying(100),
    type character varying
);


--
-- Name: gl_account_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_account_balances (
    id integer NOT NULL,
    account_id character varying(255) NOT NULL,
    current_balance numeric(15,2) DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    period_balances jsonb DEFAULT '{}'::jsonb,
    branch_id character varying(255)
);


--
-- Name: gl_account_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gl_account_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gl_account_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gl_account_balances_id_seq OWNED BY public.gl_account_balances.id;


--
-- Name: gl_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    type character varying(32) NOT NULL,
    parent_id uuid,
    balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    CONSTRAINT gl_accounts_type_check CHECK (((type)::text = ANY (ARRAY[('Asset'::character varying)::text, ('Liability'::character varying)::text, ('Equity'::character varying)::text, ('Revenue'::character varying)::text, ('Expense'::character varying)::text])))
);


--
-- Name: gl_journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    account_id uuid NOT NULL,
    account_code character varying(100) NOT NULL,
    debit numeric(15,2) DEFAULT 0,
    credit numeric(15,2) DEFAULT 0,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gl_journal_entries_check CHECK (((debit > (0)::numeric) OR (credit > (0)::numeric))),
    CONSTRAINT gl_journal_entries_check1 CHECK ((NOT ((debit > (0)::numeric) AND (credit > (0)::numeric)))),
    CONSTRAINT gl_journal_entries_credit_check CHECK ((credit >= (0)::numeric)),
    CONSTRAINT gl_journal_entries_debit_check CHECK ((debit >= (0)::numeric))
);


--
-- Name: gl_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    transaction_type character varying(50) NOT NULL,
    gl_account_id uuid NOT NULL,
    float_account_id uuid,
    mapping_type character varying(32) DEFAULT 'main'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: gl_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_sync_logs (
    id uuid NOT NULL,
    module character varying(50) NOT NULL,
    operation character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    details text,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gl_sync_logs_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'partial'::character varying])::text[])))
);


--
-- Name: gl_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_transactions (
    id uuid NOT NULL,
    date date NOT NULL,
    source_module character varying(50) NOT NULL,
    source_transaction_id character varying(255) NOT NULL,
    source_transaction_type character varying(100) NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    posted_by character varying(255),
    posted_at timestamp with time zone,
    reversed_by character varying(255),
    reversed_at timestamp with time zone,
    metadata jsonb,
    reference text,
    amount numeric,
    transaction_date date,
    branch_id uuid,
    branch_name character varying,
    CONSTRAINT gl_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'posted'::character varying, 'reversed'::character varying])::text[])))
);


--
-- Name: jumia_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jumia_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying(50) NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    transaction_type character varying(20) NOT NULL,
    tracking_id character varying(100),
    customer_name character varying(255),
    customer_phone character varying(20),
    amount numeric(10,2) DEFAULT 0,
    settlement_reference character varying(100),
    settlement_from_date date,
    settlement_to_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    delivery_status character varying(20),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    float_account_id uuid,
    fee numeric DEFAULT 0,
    deleted boolean DEFAULT false,
    is_reversal boolean DEFAULT false,
    original_transaction_id uuid,
    reference character varying,
    payment_method character varying
);


--
-- Name: jumia_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jumia_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jumia_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jumia_transactions_id_seq OWNED BY public.jumia_transactions.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    ip_address character varying(45) NOT NULL,
    user_agent text,
    success boolean NOT NULL,
    failure_reason character varying(255),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: momo_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.momo_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name character varying(255) NOT NULL,
    phone_number character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0,
    provider character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    reference character varying(100),
    notes text,
    status character varying(20) DEFAULT 'completed'::character varying,
    branch_id uuid NOT NULL,
    processed_by character varying(255),
    float_account_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id uuid,
    cash_till_affected character varying,
    float_affected character varying,
    date date,
    gl_entry_id uuid,
    deleted boolean DEFAULT false,
    is_reversal boolean,
    original_transaction_id uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    branch_id character varying(255),
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'unread'::character varying,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: partner_banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_banks (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    transfer_fee numeric(5,4) DEFAULT 0.01 NOT NULL,
    min_fee numeric(10,2) DEFAULT 5.00 NOT NULL,
    max_fee numeric(10,2) DEFAULT 50.00 NOT NULL,
    float_account_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    branch_id uuid
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: power_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.power_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference character varying(50) NOT NULL,
    type character varying(20) DEFAULT 'sale'::character varying,
    meter_number character varying(50) NOT NULL,
    provider character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    commission numeric(15,2) DEFAULT 0,
    customer_name character varying(255),
    customer_phone character varying(20),
    status character varying(20) DEFAULT 'completed'::character varying,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fee numeric DEFAULT 0,
    float_account_id character varying(30),
    processed_by character varying(30),
    date date,
    gl_entry_id uuid,
    notes text,
    deleted boolean DEFAULT false,
    original_transaction_id uuid,
    is_reversal boolean DEFAULT false,
    CONSTRAINT power_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT power_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying, 'deleted'::character varying])::text[]))),
    CONSTRAINT power_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['sale'::character varying, 'purchase'::character varying])::text[])))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    permissions text[],
    is_default boolean DEFAULT false,
    is_system boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_type character varying(100) NOT NULL,
    severity character varying(20) NOT NULL,
    description text NOT NULL,
    ip_address character varying(45),
    user_agent text,
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text,
    config_type character varying(50) DEFAULT 'string'::character varying,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    is_encrypted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


--
-- Name: system_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_config_id_seq OWNED BY public.system_config.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    data_type character varying(20) DEFAULT 'string'::character varying,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_settings_data_type_check CHECK (((data_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: user_branch_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_branch_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_notifications boolean DEFAULT true,
    email_address character varying(255),
    sms_notifications boolean DEFAULT false,
    phone_number character varying(20),
    push_notifications boolean DEFAULT true,
    transaction_alerts boolean DEFAULT true,
    float_threshold_alerts boolean DEFAULT true,
    system_updates boolean DEFAULT true,
    security_alerts boolean DEFAULT true,
    daily_reports boolean DEFAULT false,
    weekly_reports boolean DEFAULT false,
    login_alerts boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
    alert_frequency character varying(20) DEFAULT 'immediate'::character varying,
    report_frequency character varying(20) DEFAULT 'weekly'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sms_provider character varying(50),
    sms_sender_id character varying(50),
    sms_api_key character varying(255),
    sms_api_secret character varying(255),
    CONSTRAINT user_notification_settings_alert_frequency_check CHECK (((alert_frequency)::text = ANY ((ARRAY['immediate'::character varying, 'hourly'::character varying, 'daily'::character varying])::text[]))),
    CONSTRAINT user_notification_settings_report_frequency_check CHECK (((report_frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[])))
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text,
    is_active boolean DEFAULT true
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    primary_branch_id uuid,
    phone character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    password_hash character varying(255),
    password_reset_required boolean DEFAULT false,
    last_password_reset timestamp without time zone,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    avatar character varying(255)
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: fee_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_config ALTER COLUMN id SET DEFAULT nextval('public.fee_config_id_seq'::regclass);


--
-- Name: gl_account_balances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_balances ALTER COLUMN id SET DEFAULT nextval('public.gl_account_balances_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: system_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config ALTER COLUMN id SET DEFAULT nextval('public.system_config_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: users_sync users_sync_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.users_sync
    ADD CONSTRAINT users_sync_pkey PRIMARY KEY (id);


--
-- Name: agency_banking_transactions agency_banking_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_banking_transactions
    ADD CONSTRAINT agency_banking_transactions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: branches branches_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_code_key UNIQUE (code);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_reference_key UNIQUE (reference);


--
-- Name: e_zwich_card_issuances e_zwich_card_issuances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_card_issuances
    ADD CONSTRAINT e_zwich_card_issuances_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_partner_accounts e_zwich_partner_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_partner_accounts
    ADD CONSTRAINT e_zwich_partner_accounts_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_withdrawals e_zwich_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_withdrawals
    ADD CONSTRAINT e_zwich_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_withdrawals e_zwich_withdrawals_transaction_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_withdrawals
    ADD CONSTRAINT e_zwich_withdrawals_transaction_reference_key UNIQUE (transaction_reference);


--
-- Name: expense_heads expense_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_heads
    ADD CONSTRAINT expense_heads_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_reference_number_key UNIQUE (reference_number);


--
-- Name: ezwich_card_batches ezwich_card_batches_batch_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_card_batches
    ADD CONSTRAINT ezwich_card_batches_batch_code_key UNIQUE (batch_code);


--
-- Name: ezwich_card_batches ezwich_card_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_card_batches
    ADD CONSTRAINT ezwich_card_batches_pkey PRIMARY KEY (id);


--
-- Name: ezwich_card_issuance ezwich_card_issuance_card_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_card_issuance
    ADD CONSTRAINT ezwich_card_issuance_card_number_key UNIQUE (card_number);


--
-- Name: ezwich_card_issuance ezwich_card_issuance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_card_issuance
    ADD CONSTRAINT ezwich_card_issuance_pkey PRIMARY KEY (id);


--
-- Name: ezwich_cards ezwich_cards_card_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_cards
    ADD CONSTRAINT ezwich_cards_card_number_key UNIQUE (card_number);


--
-- Name: ezwich_cards ezwich_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_cards
    ADD CONSTRAINT ezwich_cards_pkey PRIMARY KEY (id);


--
-- Name: ezwich_transactions ezwich_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_transactions
    ADD CONSTRAINT ezwich_transactions_pkey PRIMARY KEY (id);


--
-- Name: fee_config fee_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_config
    ADD CONSTRAINT fee_config_pkey PRIMARY KEY (id);


--
-- Name: fee_config fee_config_service_type_transaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_config
    ADD CONSTRAINT fee_config_service_type_transaction_type_key UNIQUE (service_type, transaction_type);


--
-- Name: float_accounts float_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.float_accounts
    ADD CONSTRAINT float_accounts_pkey PRIMARY KEY (id);


--
-- Name: float_transactions float_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.float_transactions
    ADD CONSTRAINT float_transactions_pkey PRIMARY KEY (id);


--
-- Name: gl_account_balances gl_account_balances_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_balances
    ADD CONSTRAINT gl_account_balances_account_id_key UNIQUE (account_id);


--
-- Name: gl_account_balances gl_account_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_balances
    ADD CONSTRAINT gl_account_balances_pkey PRIMARY KEY (id);


--
-- Name: gl_accounts gl_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_code_key UNIQUE (code);


--
-- Name: gl_accounts gl_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_pkey PRIMARY KEY (id);


--
-- Name: gl_journal_entries gl_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_journal_entries
    ADD CONSTRAINT gl_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: gl_mappings gl_mappings_branch_id_transaction_type_mapping_type_float_a_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_branch_id_transaction_type_mapping_type_float_a_key UNIQUE (branch_id, transaction_type, mapping_type, float_account_id);


--
-- Name: gl_mappings gl_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_pkey PRIMARY KEY (id);


--
-- Name: gl_sync_logs gl_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_sync_logs
    ADD CONSTRAINT gl_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: gl_transactions gl_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_transactions
    ADD CONSTRAINT gl_transactions_pkey PRIMARY KEY (id);


--
-- Name: jumia_transactions jumia_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jumia_transactions
    ADD CONSTRAINT jumia_transactions_pkey PRIMARY KEY (id);


--
-- Name: jumia_transactions jumia_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jumia_transactions
    ADD CONSTRAINT jumia_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: momo_transactions momo_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_transactions
    ADD CONSTRAINT momo_transactions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: partner_banks partner_banks_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_banks
    ADD CONSTRAINT partner_banks_code_key UNIQUE (code);


--
-- Name: partner_banks partner_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_banks
    ADD CONSTRAINT partner_banks_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: power_transactions power_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_transactions
    ADD CONSTRAINT power_transactions_pkey PRIMARY KEY (id);


--
-- Name: power_transactions power_transactions_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_transactions
    ADD CONSTRAINT power_transactions_reference_key UNIQUE (reference);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_config_key_key UNIQUE (config_key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_partner_accounts unique_branch_bank_account; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_partner_accounts
    ADD CONSTRAINT unique_branch_bank_account UNIQUE (branch_id, bank_name, account_number);


--
-- Name: user_branch_assignments user_branch_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_branch_assignments user_branch_assignments_user_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_user_id_branch_id_key UNIQUE (user_id, branch_id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX users_sync_deleted_at_idx ON neon_auth.users_sync USING btree (deleted_at);


--
-- Name: idx_agency_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_branch_id ON public.agency_banking_transactions USING btree (branch_id);


--
-- Name: idx_agency_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_created_at ON public.agency_banking_transactions USING btree (created_at);


--
-- Name: idx_agency_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_status ON public.agency_banking_transactions USING btree (status);


--
-- Name: idx_agency_transactions_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_account_number ON public.agency_banking_transactions USING btree (account_number);


--
-- Name: idx_agency_transactions_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_branch_date ON public.agency_banking_transactions USING btree (branch_id, date);


--
-- Name: idx_agency_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_branch_id ON public.agency_banking_transactions USING btree (branch_id);


--
-- Name: idx_agency_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_date ON public.agency_banking_transactions USING btree (date);


--
-- Name: idx_agency_transactions_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_is_reversal ON public.agency_banking_transactions USING btree (is_reversal);


--
-- Name: idx_agency_transactions_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_original_id ON public.agency_banking_transactions USING btree (original_transaction_id);


--
-- Name: idx_agency_transactions_partner_bank_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_partner_bank_code ON public.agency_banking_transactions USING btree (partner_bank_code);


--
-- Name: idx_agency_transactions_partner_bank_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_partner_bank_id ON public.agency_banking_transactions USING btree (partner_bank_id);


--
-- Name: idx_agency_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_status ON public.agency_banking_transactions USING btree (status);


--
-- Name: idx_agency_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_transactions_user_id ON public.agency_banking_transactions USING btree (user_id);


--
-- Name: idx_audit_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action_type ON public.audit_logs USING btree (action_type);


--
-- Name: idx_audit_logs_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_branch_id ON public.audit_logs USING btree (branch_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: idx_audit_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_severity ON public.audit_logs USING btree (severity);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_branches_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_code ON public.branches USING btree (code);


--
-- Name: idx_branches_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_name ON public.branches USING btree (name);


--
-- Name: idx_branches_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_region ON public.branches USING btree (region);


--
-- Name: idx_branches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_status ON public.branches USING btree (status);


--
-- Name: idx_card_batches_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_batches_branch ON public.ezwich_card_batches USING btree (branch_id);


--
-- Name: idx_card_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_batches_status ON public.ezwich_card_batches USING btree (status);


--
-- Name: idx_commissions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_branch_id ON public.commissions USING btree (branch_id);


--
-- Name: idx_commissions_commission_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_commission_rate ON public.commissions USING btree (commission_rate);


--
-- Name: idx_commissions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_created_at ON public.commissions USING btree (created_at);


--
-- Name: idx_commissions_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_is_reversal ON public.commissions USING btree (is_reversal);


--
-- Name: idx_commissions_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_month ON public.commissions USING btree (month);


--
-- Name: idx_commissions_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_original_id ON public.commissions USING btree (original_transaction_id);


--
-- Name: idx_commissions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_source ON public.commissions USING btree (source);


--
-- Name: idx_commissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_status ON public.commissions USING btree (status);


--
-- Name: idx_commissions_transaction_volume; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commissions_transaction_volume ON public.commissions USING btree (transaction_volume);


--
-- Name: idx_e_zwich_batches_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_zwich_batches_branch_id ON public.ezwich_card_batches USING btree (branch_id);


--
-- Name: idx_e_zwich_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_zwich_batches_status ON public.ezwich_card_batches USING btree (status);


--
-- Name: idx_e_zwich_partner_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_zwich_partner_accounts_active ON public.e_zwich_partner_accounts USING btree (is_active);


--
-- Name: idx_e_zwich_partner_accounts_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e_zwich_partner_accounts_branch_id ON public.e_zwich_partner_accounts USING btree (branch_id);


--
-- Name: idx_expense_heads_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_heads_category ON public.expense_heads USING btree (category);


--
-- Name: idx_expense_heads_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_heads_is_active ON public.expense_heads USING btree (is_active);


--
-- Name: idx_expenses_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_branch_id ON public.expenses USING btree (branch_id);


--
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- Name: idx_expenses_expense_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_expense_head_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_expense_head_id ON public.expenses USING btree (expense_head_id);


--
-- Name: idx_expenses_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_is_reversal ON public.expenses USING btree (is_reversal);


--
-- Name: idx_expenses_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_original_id ON public.expenses USING btree (original_transaction_id);


--
-- Name: idx_expenses_reference_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_reference_number ON public.expenses USING btree (reference_number);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_ezwich_batches_batch_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_batches_batch_code ON public.ezwich_card_batches USING btree (batch_code);


--
-- Name: idx_ezwich_batches_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_batches_branch ON public.ezwich_card_batches USING btree (branch_id);


--
-- Name: idx_ezwich_batches_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_batches_created_at ON public.ezwich_card_batches USING btree (created_at);


--
-- Name: idx_ezwich_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_batches_status ON public.ezwich_card_batches USING btree (status);


--
-- Name: idx_ezwich_issuances_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_issuances_branch_id ON public.e_zwich_card_issuances USING btree (branch_id);


--
-- Name: idx_ezwich_issuances_card_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_issuances_card_number ON public.e_zwich_card_issuances USING btree (card_number);


--
-- Name: idx_ezwich_issuances_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_issuances_created_at ON public.e_zwich_card_issuances USING btree (created_at);


--
-- Name: idx_ezwich_transactions_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_transactions_is_reversal ON public.e_zwich_withdrawals USING btree (is_reversal);


--
-- Name: idx_ezwich_transactions_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_transactions_original_id ON public.e_zwich_withdrawals USING btree (original_transaction_id);


--
-- Name: idx_ezwich_withdrawals_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_withdrawals_branch_id ON public.e_zwich_withdrawals USING btree (branch_id);


--
-- Name: idx_ezwich_withdrawals_card_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_withdrawals_card_number ON public.e_zwich_withdrawals USING btree (card_number);


--
-- Name: idx_ezwich_withdrawals_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ezwich_withdrawals_created_at ON public.e_zwich_withdrawals USING btree (created_at);


--
-- Name: idx_float_accounts_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_float_accounts_account_type ON public.float_accounts USING btree (account_type);


--
-- Name: idx_float_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_float_accounts_active ON public.float_accounts USING btree (is_active);


--
-- Name: idx_float_accounts_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_float_accounts_branch_id ON public.float_accounts USING btree (branch_id);


--
-- Name: idx_float_accounts_branch_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_float_accounts_branch_type ON public.float_accounts USING btree (branch_id, account_type);


--
-- Name: idx_float_accounts_isezwichpartner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_float_accounts_isezwichpartner ON public.float_accounts USING btree (isezwichpartner);


--
-- Name: idx_float_accounts_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_float_accounts_provider ON public.float_accounts USING btree (provider);


--
-- Name: idx_gl_account_balances_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_account_balances_branch_id ON public.gl_account_balances USING btree (branch_id);


--
-- Name: idx_gl_accounts_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_code ON public.gl_accounts USING btree (code);


--
-- Name: idx_gl_accounts_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_parent ON public.gl_accounts USING btree (parent_id);


--
-- Name: idx_gl_accounts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_type ON public.gl_accounts USING btree (type);


--
-- Name: idx_gl_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_transactions_date ON public.gl_transactions USING btree (date);


--
-- Name: idx_gl_transactions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_transactions_source ON public.gl_transactions USING btree (source_transaction_id);


--
-- Name: idx_jumia_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jumia_branch_date ON public.jumia_transactions USING btree (branch_id, created_at);


--
-- Name: idx_jumia_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jumia_tracking ON public.jumia_transactions USING btree (tracking_id);


--
-- Name: idx_jumia_transactions_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jumia_transactions_branch_date ON public.jumia_transactions USING btree (branch_id, created_at);


--
-- Name: idx_jumia_transactions_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jumia_transactions_is_reversal ON public.jumia_transactions USING btree (is_reversal);


--
-- Name: idx_jumia_transactions_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jumia_transactions_original_id ON public.jumia_transactions USING btree (original_transaction_id);


--
-- Name: idx_jumia_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jumia_type_status ON public.jumia_transactions USING btree (transaction_type, status);


--
-- Name: idx_login_attempts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email, "timestamp");


--
-- Name: idx_login_attempts_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address, "timestamp");


--
-- Name: idx_momo_transactions_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_transactions_is_reversal ON public.momo_transactions USING btree (is_reversal);


--
-- Name: idx_momo_transactions_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_transactions_original_id ON public.momo_transactions USING btree (original_transaction_id);


--
-- Name: idx_power_transactions_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_branch_date ON public.power_transactions USING btree (branch_id, created_at);


--
-- Name: idx_power_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_branch_id ON public.power_transactions USING btree (branch_id);


--
-- Name: idx_power_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_created_at ON public.power_transactions USING btree (created_at);


--
-- Name: idx_power_transactions_is_reversal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_is_reversal ON public.power_transactions USING btree (is_reversal);


--
-- Name: idx_power_transactions_original_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_original_id ON public.power_transactions USING btree (original_transaction_id);


--
-- Name: idx_power_transactions_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_provider ON public.power_transactions USING btree (provider);


--
-- Name: idx_power_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_reference ON public.power_transactions USING btree (reference);


--
-- Name: idx_power_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_type ON public.power_transactions USING btree (type);


--
-- Name: idx_power_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_power_transactions_user_id ON public.power_transactions USING btree (user_id);


--
-- Name: idx_security_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id, "timestamp");


--
-- Name: idx_system_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_category ON public.system_config USING btree (category);


--
-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_key ON public.system_config USING btree (config_key);


--
-- Name: idx_user_branch_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_branch_branch_id ON public.user_branch_assignments USING btree (branch_id);


--
-- Name: idx_user_branch_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_branch_user_id ON public.user_branch_assignments USING btree (user_id);


--
-- Name: idx_user_notification_settings_email_notifications; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notification_settings_email_notifications ON public.user_notification_settings USING btree (email_notifications);


--
-- Name: idx_user_notification_settings_sms_notifications; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notification_settings_sms_notifications ON public.user_notification_settings USING btree (sms_notifications);


--
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_primary_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_primary_branch ON public.users USING btree (primary_branch_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: unique_cash_in_till_per_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_cash_in_till_per_branch ON public.float_accounts USING btree (branch_id) WHERE ((account_type)::text = 'cash-in-till'::text);


--
-- Name: unique_jumia_per_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_jumia_per_branch ON public.float_accounts USING btree (branch_id) WHERE ((account_type)::text = 'jumia'::text);


--
-- Name: unique_power_per_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_power_per_branch ON public.float_accounts USING btree (branch_id) WHERE ((account_type)::text = 'power'::text);


--
-- Name: power_transactions trigger_power_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_power_transactions_updated_at BEFORE UPDATE ON public.power_transactions FOR EACH ROW EXECUTE FUNCTION public.update_power_transactions_updated_at();


--
-- Name: agency_banking_transactions update_agency_banking_transactions_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agency_banking_transactions_timestamp BEFORE UPDATE ON public.agency_banking_transactions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: agency_banking_transactions update_agency_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agency_transactions_updated_at BEFORE UPDATE ON public.agency_banking_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commissions update_commissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: e_zwich_withdrawals update_e_zwich_withdrawals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_e_zwich_withdrawals_updated_at BEFORE UPDATE ON public.e_zwich_withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expense_heads update_expense_heads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expense_heads_updated_at BEFORE UPDATE ON public.expense_heads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: e_zwich_card_issuances update_ezwich_issuances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ezwich_issuances_updated_at BEFORE UPDATE ON public.e_zwich_card_issuances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: float_accounts update_float_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_float_accounts_updated_at BEFORE UPDATE ON public.float_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: power_transactions update_power_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_power_transactions_updated_at BEFORE UPDATE ON public.power_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_settings update_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_user_notification_settings_updated_at();


--
-- Name: expenses expenses_expense_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_head_id_fkey FOREIGN KEY (expense_head_id) REFERENCES public.expense_heads(id);


--
-- Name: ezwich_cards ezwich_cards_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ezwich_cards
    ADD CONSTRAINT ezwich_cards_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ezwich_card_batches(id);


--
-- Name: agency_banking_transactions fk_agency_transactions_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_banking_transactions
    ADD CONSTRAINT fk_agency_transactions_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: expenses fk_expenses_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: expenses fk_expenses_expense_head; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_expense_head FOREIGN KEY (expense_head_id) REFERENCES public.expense_heads(id) ON DELETE CASCADE;


--
-- Name: e_zwich_card_issuances fk_ezwich_issuances_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_card_issuances
    ADD CONSTRAINT fk_ezwich_issuances_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: e_zwich_withdrawals fk_ezwich_withdrawals_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e_zwich_withdrawals
    ADD CONSTRAINT fk_ezwich_withdrawals_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: float_accounts fk_float_accounts_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.float_accounts
    ADD CONSTRAINT fk_float_accounts_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: jumia_transactions fk_jumia_transactions_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jumia_transactions
    ADD CONSTRAINT fk_jumia_transactions_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: power_transactions fk_power_transactions_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_transactions
    ADD CONSTRAINT fk_power_transactions_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: user_branch_assignments fk_user_branch_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT fk_user_branch_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE NOT VALID;


--
-- Name: user_branch_assignments fk_user_branch_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT fk_user_branch_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;


--
-- Name: users fk_users_primary_branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_primary_branch FOREIGN KEY (primary_branch_id) REFERENCES public.branches(id) ON DELETE SET NULL NOT VALID;


--
-- Name: float_accounts float_accounts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.float_accounts
    ADD CONSTRAINT float_accounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: float_transactions float_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.float_transactions
    ADD CONSTRAINT float_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.float_accounts(id);


--
-- Name: float_transactions float_transactions_float_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.float_transactions
    ADD CONSTRAINT float_transactions_float_account_id_fkey FOREIGN KEY (float_account_id) REFERENCES public.float_accounts(id);


--
-- Name: gl_accounts gl_accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.gl_accounts(id);


--
-- Name: gl_journal_entries gl_journal_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_journal_entries
    ADD CONSTRAINT gl_journal_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.gl_accounts(id);


--
-- Name: gl_journal_entries gl_journal_entries_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_journal_entries
    ADD CONSTRAINT gl_journal_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.gl_transactions(id) ON DELETE CASCADE;


--
-- Name: gl_mappings gl_mappings_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

