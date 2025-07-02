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
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA neon_auth;


ALTER SCHEMA neon_auth OWNER TO neondb_owner;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: agency_transaction_status; Type: TYPE; Schema: public; Owner: neondb_owner
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


ALTER TYPE public.agency_transaction_status OWNER TO neondb_owner;

--
-- Name: agency_transaction_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.agency_transaction_type AS ENUM (
    'deposit',
    'withdrawal',
    'interbank',
    'commission'
);


ALTER TYPE public.agency_transaction_type OWNER TO neondb_owner;

--
-- Name: batch_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.batch_status AS ENUM (
    'received',
    'in_use',
    'depleted',
    'expired'
);


ALTER TYPE public.batch_status OWNER TO neondb_owner;

--
-- Name: card_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.card_status AS ENUM (
    'active',
    'inactive',
    'blocked',
    'expired'
);


ALTER TYPE public.card_status OWNER TO neondb_owner;

--
-- Name: reversal_status_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.reversal_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);


ALTER TYPE public.reversal_status_enum OWNER TO neondb_owner;

--
-- Name: transaction_status; Type: TYPE; Schema: public; Owner: neondb_owner
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


ALTER TYPE public.transaction_status OWNER TO neondb_owner;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.transaction_type AS ENUM (
    'card_issuance',
    'withdrawal',
    'balance_inquiry',
    'pin_change'
);


ALTER TYPE public.transaction_type OWNER TO neondb_owner;

--
-- Name: update_batch_quantity_on_issuance(); Type: FUNCTION; Schema: public; Owner: neondb_owner
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


ALTER FUNCTION public.update_batch_quantity_on_issuance() OWNER TO neondb_owner;

--
-- Name: update_momo_transactions_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_momo_transactions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_momo_transactions_updated_at() OWNER TO neondb_owner;

--
-- Name: update_power_transactions_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_power_transactions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_power_transactions_updated_at() OWNER TO neondb_owner;

--
-- Name: update_stock_movements_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_stock_movements_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_stock_movements_updated_at() OWNER TO neondb_owner;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_timestamp() OWNER TO neondb_owner;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO neondb_owner;

--
-- Name: update_user_notification_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_user_notification_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_notification_settings_updated_at() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users_sync; Type: TABLE; Schema: neon_auth; Owner: neondb_owner
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


ALTER TABLE neon_auth.users_sync OWNER TO neondb_owner;

--
-- Name: agency_banking_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agency_banking_transactions (
    id character varying(50) NOT NULL,
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
    metadata jsonb
);


ALTER TABLE public.agency_banking_transactions OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO neondb_owner;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: branch_partner_banks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.branch_partner_banks (
    id character varying(50) NOT NULL,
    branch_id uuid NOT NULL,
    partner_bank_id uuid NOT NULL,
    float_account_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.branch_partner_banks OWNER TO neondb_owner;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.branches OWNER TO neondb_owner;

--
-- Name: cash_till; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cash_till (
    id integer NOT NULL,
    branch_id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(15,2) DEFAULT 0,
    opening_balance numeric(15,2) DEFAULT 0,
    closing_balance numeric(15,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cash_till OWNER TO neondb_owner;

--
-- Name: cash_till_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cash_till_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    current_balance numeric(15,2) DEFAULT 0.00,
    branch_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cash_till_accounts OWNER TO neondb_owner;

--
-- Name: cash_till_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.cash_till_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cash_till_id_seq OWNER TO neondb_owner;

--
-- Name: cash_till_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.cash_till_id_seq OWNED BY public.cash_till.id;


--
-- Name: commission_approvals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.commission_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commission_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    notes text,
    approved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_by_id character varying(255) NOT NULL,
    approved_by_name character varying(255) NOT NULL,
    CONSTRAINT commission_approvals_action_check CHECK (((action)::text = ANY ((ARRAY['approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.commission_approvals OWNER TO neondb_owner;

--
-- Name: commission_comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.commission_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commission_id uuid NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by_id character varying(255) NOT NULL,
    created_by_name character varying(255) NOT NULL
);


ALTER TABLE public.commission_comments OWNER TO neondb_owner;

--
-- Name: commission_metadata; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.commission_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commission_id uuid NOT NULL,
    transaction_volume integer,
    commission_rate character varying(20),
    settlement_period character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.commission_metadata OWNER TO neondb_owner;

--
-- Name: commission_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.commission_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commission_id uuid NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    method character varying(50) DEFAULT 'bank_transfer'::character varying NOT NULL,
    received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    bank_account character varying(255),
    reference_number character varying(255),
    notes text,
    processed_by_id character varying(255) NOT NULL,
    processed_by_name character varying(255) NOT NULL,
    processed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT commission_payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.commission_payments OWNER TO neondb_owner;

--
-- Name: commissions; Type: TABLE; Schema: public; Owner: neondb_owner
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
    receipt_url character varying(255),
    CONSTRAINT commissions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'paid'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.commissions OWNER TO neondb_owner;

--
-- Name: e_zwich_card_issuances; Type: TABLE; Schema: public; Owner: neondb_owner
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
    user_id character varying(255),
    processed_by character varying(255),
    username character varying(100),
    CONSTRAINT e_zwich_card_issuances_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT e_zwich_card_issuances_id_type_check CHECK (((id_type)::text = ANY ((ARRAY['ghana_card'::character varying, 'voters_id'::character varying, 'passport'::character varying, 'drivers_license'::character varying])::text[]))),
    CONSTRAINT e_zwich_card_issuances_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'momo'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT e_zwich_card_issuances_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.e_zwich_card_issuances OWNER TO neondb_owner;

--
-- Name: e_zwich_partner_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.e_zwich_partner_accounts OWNER TO neondb_owner;

--
-- Name: e_zwich_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.e_zwich_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_type character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    fee numeric(15,2) DEFAULT 0,
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(20),
    card_number character varying(50),
    reference character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.e_zwich_transactions OWNER TO neondb_owner;

--
-- Name: e_zwich_withdrawals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.e_zwich_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_reference character varying(50),
    card_number character varying(20) NOT NULL,
    customer_name character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0.00,
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
    processed_by character varying(255)
);


ALTER TABLE public.e_zwich_withdrawals OWNER TO neondb_owner;

--
-- Name: expense_approvals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.expense_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    comments text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT expense_approvals_action_check CHECK (((action)::text = ANY ((ARRAY['approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.expense_approvals OWNER TO neondb_owner;

--
-- Name: expense_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.expense_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    file_type character varying(100),
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expense_attachments OWNER TO neondb_owner;

--
-- Name: expense_heads; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.expense_heads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    gl_account_code character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expense_heads OWNER TO neondb_owner;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: neondb_owner
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
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expenses_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'paid'::character varying])::text[])))
);


ALTER TABLE public.expenses OWNER TO neondb_owner;

--
-- Name: ezwich_card_batches; Type: TABLE; Schema: public; Owner: neondb_owner
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
    CONSTRAINT chk_quantity_issued_not_exceed_received CHECK ((quantity_issued <= quantity_received)),
    CONSTRAINT ezwich_card_batches_quantity_issued_check CHECK ((quantity_issued >= 0)),
    CONSTRAINT ezwich_card_batches_quantity_received_check CHECK ((quantity_received > 0))
);


ALTER TABLE public.ezwich_card_batches OWNER TO neondb_owner;

--
-- Name: ezwich_cards; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.ezwich_cards OWNER TO neondb_owner;

--
-- Name: ezwich_stock_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ezwich_stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    batch_code character varying(100) NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    quantity_change integer NOT NULL,
    movement_type character varying(20) NOT NULL,
    notes text,
    user_id character varying(100) NOT NULL,
    username character varying(100) NOT NULL,
    branch_id character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ezwich_stock_movements_movement_type_check CHECK (((movement_type)::text = ANY ((ARRAY['receipt'::character varying, 'issuance'::character varying, 'adjustment'::character varying, 'deletion'::character varying])::text[])))
);


ALTER TABLE public.ezwich_stock_movements OWNER TO neondb_owner;

--
-- Name: ezwich_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ezwich_transactions OWNER TO neondb_owner;

--
-- Name: ezwich_withdrawals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ezwich_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_reference character varying(50) NOT NULL,
    card_number character varying(20) NOT NULL,
    customer_name character varying(100) NOT NULL,
    customer_phone character varying(15) NOT NULL,
    amount numeric(10,2) NOT NULL,
    fee numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) GENERATED ALWAYS AS ((amount + fee)) STORED,
    branch_id character varying(50) NOT NULL,
    processed_by character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    terminal_id character varying(50),
    receipt_number character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ezwich_withdrawals OWNER TO neondb_owner;

--
-- Name: fee_config; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.fee_config OWNER TO neondb_owner;

--
-- Name: fee_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.fee_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fee_config_id_seq OWNER TO neondb_owner;

--
-- Name: fee_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.fee_config_id_seq OWNED BY public.fee_config.id;


--
-- Name: float_account_gl_mapping; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.float_account_gl_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    float_account_id uuid NOT NULL,
    gl_account_id uuid NOT NULL,
    mapping_type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.float_account_gl_mapping OWNER TO neondb_owner;

--
-- Name: float_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
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
    CONSTRAINT valid_account_type CHECK (((account_type)::text = ANY ((ARRAY['cash-in-till'::character varying, 'e-zwich'::character varying, 'power'::character varying, 'momo'::character varying, 'agency-banking'::character varying])::text[]))),
    CONSTRAINT valid_balance CHECK ((current_balance >= (0)::numeric)),
    CONSTRAINT valid_thresholds CHECK (((min_threshold >= (0)::numeric) AND (max_threshold >= min_threshold)))
);


ALTER TABLE public.float_accounts OWNER TO neondb_owner;

--
-- Name: float_accounts_with_branch; Type: VIEW; Schema: public; Owner: neondb_owner
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


ALTER VIEW public.float_accounts_with_branch OWNER TO neondb_owner;

--
-- Name: float_gl_mapping; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.float_gl_mapping (
    id uuid NOT NULL,
    float_account_id uuid NOT NULL,
    gl_account_id uuid NOT NULL,
    mapping_type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.float_gl_mapping OWNER TO neondb_owner;

--
-- Name: float_gl_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.float_gl_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    float_account_id uuid NOT NULL,
    gl_account_id uuid NOT NULL,
    mapping_type character varying(50) DEFAULT 'main_account'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.float_gl_mappings OWNER TO neondb_owner;

--
-- Name: float_recharge_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.float_recharge_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    float_account_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    balance_before numeric(15,2) NOT NULL,
    balance_after numeric(15,2) NOT NULL,
    recharge_method character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    reference character varying(255),
    notes text,
    processed_by uuid NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.float_recharge_transactions OWNER TO neondb_owner;

--
-- Name: float_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.float_transactions OWNER TO neondb_owner;

--
-- Name: gl_account_balances; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gl_account_balances (
    id integer NOT NULL,
    account_id character varying(255) NOT NULL,
    current_balance numeric(15,2) DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    period_balances jsonb DEFAULT '{}'::jsonb,
    branch_id character varying(255)
);


ALTER TABLE public.gl_account_balances OWNER TO neondb_owner;

--
-- Name: gl_account_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gl_account_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gl_account_balances_id_seq OWNER TO neondb_owner;

--
-- Name: gl_account_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gl_account_balances_id_seq OWNED BY public.gl_account_balances.id;


--
-- Name: gl_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gl_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id uuid,
    balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    CONSTRAINT gl_accounts_type_check CHECK (((type)::text = ANY ((ARRAY['Asset'::character varying, 'Liability'::character varying, 'Equity'::character varying, 'Revenue'::character varying, 'Expense'::character varying])::text[])))
);


ALTER TABLE public.gl_accounts OWNER TO neondb_owner;

--
-- Name: gl_journal_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gl_journal_entries (
    id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    account_id uuid NOT NULL,
    account_code character varying(20) NOT NULL,
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


ALTER TABLE public.gl_journal_entries OWNER TO neondb_owner;

--
-- Name: gl_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gl_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    transaction_type character varying(50) NOT NULL,
    gl_account_id uuid NOT NULL,
    float_account_id uuid,
    mapping_type character varying(50) DEFAULT 'main'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.gl_mappings OWNER TO neondb_owner;

--
-- Name: gl_sync_logs; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.gl_sync_logs OWNER TO neondb_owner;

--
-- Name: gl_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
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
    CONSTRAINT gl_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'posted'::character varying, 'reversed'::character varying])::text[])))
);


ALTER TABLE public.gl_transactions OWNER TO neondb_owner;

--
-- Name: jumia_liability; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.jumia_liability (
    id integer NOT NULL,
    branch_id character varying(50) NOT NULL,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.jumia_liability OWNER TO neondb_owner;

--
-- Name: jumia_liability_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.jumia_liability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jumia_liability_id_seq OWNER TO neondb_owner;

--
-- Name: jumia_liability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.jumia_liability_id_seq OWNED BY public.jumia_liability.id;


--
-- Name: jumia_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.jumia_transactions (
    id integer NOT NULL,
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
    fee numeric
);


ALTER TABLE public.jumia_transactions OWNER TO neondb_owner;

--
-- Name: jumia_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.jumia_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jumia_transactions_id_seq OWNER TO neondb_owner;

--
-- Name: jumia_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.jumia_transactions_id_seq OWNED BY public.jumia_transactions.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.login_attempts OWNER TO neondb_owner;

--
-- Name: momo_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
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
    branch_id character varying(255) NOT NULL,
    processed_by character varying(255),
    float_account_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id character varying,
    cash_till_affected character varying,
    float_affected character varying,
    date date,
    gl_entry_id uuid
);


ALTER TABLE public.momo_transactions OWNER TO neondb_owner;

--
-- Name: monthly_commissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.monthly_commissions (
    id uuid NOT NULL,
    branch_id uuid NOT NULL,
    service_type character varying(50) NOT NULL,
    provider character varying(100) NOT NULL,
    month character varying(7) NOT NULL,
    total_transactions integer DEFAULT 0,
    total_volume numeric(15,2) DEFAULT 0.00,
    total_commission numeric(15,2) DEFAULT 0.00,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.monthly_commissions OWNER TO neondb_owner;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: partner_banks; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.partner_banks OWNER TO neondb_owner;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.permissions OWNER TO neondb_owner;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO neondb_owner;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: power_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
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
    fee numeric,
    float_account_id character varying(30),
    processed_by character varying(30),
    date date,
    gl_entry_id uuid,
    notes text,
    CONSTRAINT power_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT power_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT power_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['sale'::character varying, 'purchase'::character varying])::text[])))
);


ALTER TABLE public.power_transactions OWNER TO neondb_owner;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.security_events OWNER TO neondb_owner;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.system_config OWNER TO neondb_owner;

--
-- Name: system_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_config_id_seq OWNER TO neondb_owner;

--
-- Name: system_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_config_id_seq OWNED BY public.system_config.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.system_settings OWNER TO neondb_owner;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO neondb_owner;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: transaction_reversals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transaction_reversals (
    id character varying(255) NOT NULL,
    transaction_id character varying(255) NOT NULL,
    reversal_type character varying(50) NOT NULL,
    service_type character varying(50) DEFAULT 'unknown'::character varying NOT NULL,
    reason text NOT NULL,
    amount numeric(15,2) DEFAULT 0,
    fee numeric(15,2) DEFAULT 0,
    customer_name character varying(255) DEFAULT ''::character varying,
    phone_number character varying(20) DEFAULT ''::character varying,
    account_number character varying(50) DEFAULT ''::character varying,
    branch_id character varying(255) DEFAULT ''::character varying,
    requested_by character varying(255) NOT NULL,
    requested_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by character varying(255),
    reviewed_at timestamp without time zone,
    review_comments text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT transaction_reversals_reversal_type_check CHECK (((reversal_type)::text = ANY ((ARRAY['reverse'::character varying, 'void'::character varying])::text[]))),
    CONSTRAINT transaction_reversals_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.transaction_reversals OWNER TO neondb_owner;

--
-- Name: user_branch_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_branch_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_branch_assignments OWNER TO neondb_owner;

--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: neondb_owner
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
    CONSTRAINT user_notification_settings_alert_frequency_check CHECK (((alert_frequency)::text = ANY ((ARRAY['immediate'::character varying, 'hourly'::character varying, 'daily'::character varying])::text[]))),
    CONSTRAINT user_notification_settings_report_frequency_check CHECK (((report_frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[])))
);


ALTER TABLE public.user_notification_settings OWNER TO neondb_owner;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true
);


ALTER TABLE public.user_sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: cash_till id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_till ALTER COLUMN id SET DEFAULT nextval('public.cash_till_id_seq'::regclass);


--
-- Name: fee_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fee_config ALTER COLUMN id SET DEFAULT nextval('public.fee_config_id_seq'::regclass);


--
-- Name: gl_account_balances id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_account_balances ALTER COLUMN id SET DEFAULT nextval('public.gl_account_balances_id_seq'::regclass);


--
-- Name: jumia_liability id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_liability ALTER COLUMN id SET DEFAULT nextval('public.jumia_liability_id_seq'::regclass);


--
-- Name: jumia_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_transactions ALTER COLUMN id SET DEFAULT nextval('public.jumia_transactions_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: system_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config ALTER COLUMN id SET DEFAULT nextval('public.system_config_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Data for Name: users_sync; Type: TABLE DATA; Schema: neon_auth; Owner: neondb_owner
--

COPY neon_auth.users_sync (raw_json, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: agency_banking_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agency_banking_transactions (id, type, amount, fee, customer_name, account_number, partner_bank, partner_bank_code, partner_bank_id, reference, status, date, branch_id, user_id, cash_till_affected, float_affected, gl_entry_id, created_at, updated_at, metadata) FROM stdin;
abt-e8228551	deposit	1000.00	0.00	Jane Smith	2464402761018	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-22 19:23:29.438+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	c561c204-8f96-4633-a658-6d0ac17a8b69	2025-06-22 19:23:29.438+00	2025-06-22 19:23:36.361966+00	\N
abt-35626405	interbank	100.00	15.00	Jane Smith	72982092782233	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-27 09:06:34.853+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	115.00	-100.00	4204a3fb-e9bf-4a00-b2d2-099db779ee04	2025-06-27 09:06:34.853+00	2025-06-27 09:06:40.715125+00	\N
abt-da10e1fa	deposit	2000.00	0.00	Jane Smith	2464402761018	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-23 20:06:06.609+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	f9109dd8-b1a0-49da-9964-89e158f737e7	2025-06-23 20:06:06.609+00	2025-06-23 20:07:12.210857+00	\N
abt-87f1ccb4	interbank	2000.00	10.00	Abdul Kadir	78249248872432	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-23 20:25:54.252+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1010.00	1000.00	23091a83-db90-40c4-ad29-b3fd2693c623	2025-06-23 20:25:54.252+00	2025-06-23 20:26:53.484308+00	\N
abt-5997afe3	deposit	100.00	5.00	Salim	298628729202	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-27 15:30:51.733+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	100.00	-100.00	5022347e-11cd-444e-88da-c6335ac73558	2025-06-27 15:30:51.733+00	2025-06-27 15:30:57.298233+00	\N
abt-11542245	deposit	2000.00	0.00	Jane Smith	2464402761018	GCB	GCB	1317f82e-b5ce-41a4-9997-6be9d2011431	\N	completed	2025-06-23 20:28:00.167+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	26b2da0e-ead2-4804-8751-86334313167e	2025-06-23 20:28:00.167+00	2025-06-23 20:28:38.01809+00	\N
abt-69d5534f	withdrawal	200.00	10.00	Ibrahim Hardi	72982092782233	GCB	GCB	1317f82e-b5ce-41a4-9997-6be9d2011431	\N	completed	2025-06-28 00:18:59.001+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-200.00	200.00	4496586a-4980-4036-9645-a65394ed35d7	2025-06-28 00:18:59.001+00	2025-06-28 00:19:09.11856+00	\N
abt-359030ae	withdrawal	3999.99	10.00	Abdul Kadir	62034028472432	Cal Bank		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751113499863	completed	2025-06-28 12:25:00.883+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-3999.99	3999.99	\N	2025-06-28 12:25:00.883+00	2025-06-28 12:25:00.883+00	\N
abt-a4e5003f	deposit	3000.00	0.00	Jane Smith	298628729202	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-23 20:39:30.309+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	3000.00	-3000.00	d352a257-9a8b-489f-ba1b-a4e34420fe57	2025-06-23 20:39:30.309+00	2025-06-23 20:56:36.442406+00	\N
abt-a93e52ab	deposit	200.00	0.00	Jane Smith	298628729202	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-24 08:29:02.78+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	200.00	-200.00	03cf7d1d-6e4e-48ef-baca-eb885fe7bb28	2025-06-24 08:29:02.78+00	2025-06-24 08:29:09.00457+00	\N
abt-05a1b4eb	withdrawal	1000.00	0.00	Jane Smith	2464402761018	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-25 11:23:01.722+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-1000.00	1000.00	4174779a-685a-402f-9718-e2ee164352be	2025-06-25 11:23:01.722+00	2025-06-25 11:23:08.202715+00	\N
abt-15068a46	deposit	200.00	0.00	Jane Smith	72982092782233	GCB	GCB	1317f82e-b5ce-41a4-9997-6be9d2011431	\N	completed	2025-06-25 11:46:12.893+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	200.00	-200.00	0cfd25b1-59e8-40a7-a63b-b8e19684b1dd	2025-06-25 11:46:12.893+00	2025-06-25 11:46:19.147614+00	\N
abt-a53762c2	deposit	1000.00	0.00	Jane Smith	72982092782233	GCB	GCB	1317f82e-b5ce-41a4-9997-6be9d2011431	\N	completed	2025-06-25 15:43:06.882+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	992103e6-97a4-4b64-8054-3da70919b90e	2025-06-25 15:43:06.882+00	2025-06-25 15:43:12.401403+00	\N
abt-5f0fa354	deposit	1000.00	5.00	Jane Smith	72982092782233	Cal Bank	Cal Bank	0b23f10b-21c5-47da-9e51-075887aad6ee	\N	completed	2025-06-26 06:56:18.336+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	a117c7c6-0a00-48e2-89bf-8a0727f99874	2025-06-26 06:56:18.336+00	2025-06-26 06:56:26.05174+00	\N
abt-45259eb3	deposit	200.00	5.00	Jane Smith	2464402761018	GCB	GCB	1317f82e-b5ce-41a4-9997-6be9d2011431	\N	completed	2025-06-26 07:43:09.296+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	200.00	-200.00	ccc29172-c569-490a-9c7b-4d2acbafae60	2025-06-26 07:43:09.296+00	2025-06-26 07:43:16.353898+00	\N
abt-608e7da1	deposit	100.00	5.00	Salim	298628729202	Fidelity Bank	Fidelity Bank	aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	\N	completed	2025-06-27 07:29:29.943+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	100.00	-100.00	67a1b187-bf87-479e-a7e6-18e3f90309dc	2025-06-27 07:29:29.943+00	2025-06-27 07:29:36.539625+00	\N
abt-0198a3ba	withdrawal	4000.00	10.00	MOHAMMED SALIM ABDUL-MAJEED	72982092782233	Fidelity Bank		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751114527995	completed	2025-06-28 12:42:09.533+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-4000.00	4000.00	f28e56d6-0f97-49cf-959a-1b2db2837441	2025-06-28 12:42:09.533+00	2025-06-28 12:42:19.241049+00	\N
abt-83488e8e	withdrawal	200.00	0.00	Abdul	39873285745245	Ecobank		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751143680313	completed	2025-06-28 20:47:59.812+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-200.00	200.00	d4860152-50b0-4b9f-ba78-26a2f8bcd253	2025-06-28 20:47:59.812+00	2025-06-28 20:48:08.782067+00	\N
abt-eb8cf217	withdrawal	2333.00	23.00	ahhsdkjfh	8628756287465	Fidelity		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751145947028	completed	2025-06-28 21:25:46.527+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-2333.00	2333.00	171feda6-6fac-4f85-8a7f-c6c59a024d88	2025-06-28 21:25:46.527+00	2025-06-28 21:25:55.751738+00	\N
73d7e500	deposit	1000.00	0.00	alfkjalskdjf	9827359827495	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751278385565	completed	2025-06-30 10:13:05.367+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	56457f2a-ee72-4742-a9f6-376532236e49	2025-06-30 10:13:05.367+00	2025-06-30 10:13:07.753696+00	\N
2fe4cda6	deposit	1000.00	10.00	sdlaksjdf	72983479578234	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751290071329	completed	2025-06-30 13:27:51.132+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	dfa01947-358e-4265-887b-c29b71adc7f8	2025-06-30 13:27:51.132+00	2025-06-30 13:27:54.216487+00	\N
86674f96	withdrawal	6000.00	30.00	gsgsfg	56374674567567	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751202933611	completed	2025-06-29 13:15:33.38+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-3000.00	3000.00	c45f3d2f-ec5e-4d05-bca7-6b1c74492321	2025-06-29 13:15:33.38+00	2025-06-29 16:04:59.12975+00	\N
9c7719a0	withdrawal	484.21	0.00	alsdjflkj	98479258734	Fidelity		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751291995915	completed	2025-06-30 13:59:55.716+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-484.21	484.21	7b1c3b93-f65e-401a-ba7d-d013fc01efaa	2025-06-30 13:59:55.716+00	2025-06-30 13:59:57.900187+00	\N
9661dc26	withdrawal	600.00	0.00	ladslfjk	98048379382574	Fidelity		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751292046688	completed	2025-06-30 14:00:46.489+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-600.00	600.00	fd9c15a7-f3b0-47c0-86e7-c8561e24e18b	2025-06-30 14:00:46.489+00	2025-06-30 14:00:48.583419+00	\N
04c79b20	withdrawal	484.21	0.00	kljflajksdf	98273459872345	Fidelity		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751292279612	completed	2025-06-30 14:04:39.412+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-484.21	484.21	e6e30264-019d-4517-a3c1-bde93a813642	2025-06-30 14:04:39.412+00	2025-06-30 14:04:41.547285+00	\N
1a8c9c3c	withdrawal	3000.00	0.00	akjsdlfjsd	279458273495	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751293582640	completed	2025-06-30 14:26:22.441+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-3000.00	3000.00	a3ab6208-65ab-4530-a3a3-f7adf971b87f	2025-06-30 14:26:22.441+00	2025-06-30 14:26:24.606057+00	\N
bd629eb0	deposit	3000.00	0.00	LJHLSKDAF LKASJD	93274592834758	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751293631450	completed	2025-06-30 14:27:11.246+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	3000.00	-3000.00	dda37a69-3aa1-4968-a410-2ff563b575dc	2025-06-30 14:27:11.246+00	2025-06-30 14:27:13.36775+00	\N
5e7bd0e2	withdrawal	3000.00	0.00	jalksdjflkjsd	2973495873434	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751294148935	completed	2025-06-30 14:35:48.736+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-3000.00	3000.00	db07bc91-6e11-437a-a669-23cd50b5145e	2025-06-30 14:35:48.736+00	2025-06-30 14:35:51.073107+00	\N
6f36f61b	withdrawal	3000.00	0.00	lajsdfjl	98027349857243	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751294178439	completed	2025-06-30 14:36:18.24+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-3000.00	3000.00	49cece8e-43bd-4c14-b64f-d9366eb64ac7	2025-06-30 14:36:18.24+00	2025-06-30 14:36:20.603385+00	\N
9001a683	withdrawal	1000.00	0.00	jlksjfglkfdg	27984739843485	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751294344856	completed	2025-06-30 14:39:04.598+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-1000.00	1000.00	fb5cdb4b-c6ce-4dd6-861c-9552568f9582	2025-06-30 14:39:04.598+00	2025-06-30 14:39:07.276908+00	\N
d706538b	deposit	1000.00	0.00	ljkajsdlfkj	934952349587	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751294401267	completed	2025-06-30 14:40:01.069+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	1ab9589c-602e-4a46-b82c-57bf603fd47e	2025-06-30 14:40:01.069+00	2025-06-30 14:40:03.33463+00	\N
bcad027a	interbank	1000.00	0.00	llajs lkajsdlfkj	983274958734	GCB		635844ab-029a-43f8-8523-d7882915266a	AGENCY-1751296543673	completed	2025-06-30 15:15:43.475+00	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	1000.00	-1000.00	62ff46e3-7e2c-47c0-af23-1de044b29eec	2025-06-30 15:15:43.475+00	2025-06-30 15:15:45.822247+00	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, user_id, username, action_type, entity_type, entity_id, description, details, ip_address, user_agent, severity, branch_id, branch_name, status, error_message, related_entities, metadata, created_at, updated_at, action) FROM stdin;
1640	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 13:42:31.618902+00	2025-06-22 13:42:31.618902+00	\N
1641	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administrator	batch_delete_failed	ezwich_batch	e0a9e3a2-2f89-41db-a735-fb6655e021f7	Failed to delete E-Zwich batch - cards already issued	{"batch_code": "EZ-266a-001", "quantity_issued": 26, "quantity_received": 205}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	failure	Cannot delete batch with issued cards (26 cards issued)	\N	\N	2025-06-22 13:50:05.705154+00	2025-06-22 13:50:05.705154+00	\N
1642	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administrator	batch_delete_failed	ezwich_batch	e0a9e3a2-2f89-41db-a735-fb6655e021f7	Failed to delete E-Zwich batch - cards already issued	{"batch_code": "EZ-266a-001", "quantity_issued": 26, "quantity_received": 205}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	failure	Cannot delete batch with issued cards (26 cards issued)	\N	\N	2025-06-22 13:50:37.665079+00	2025-06-22 13:50:37.665079+00	\N
1643	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 14:05:46.19003+00	2025-06-22 14:05:46.19003+00	\N
1644	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 14:05:46.198956+00	2025-06-22 14:05:46.198956+00	\N
1645	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 16:55:15.516287+00	2025-06-22 16:55:15.516287+00	\N
1646	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 16:55:15.520525+00	2025-06-22 16:55:15.520525+00	\N
1647	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 17:17:42.094422+00	2025-06-22 17:17:42.094422+00	\N
1648	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 17:17:42.098638+00	2025-06-22 17:17:42.098638+00	\N
1649	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 2, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 17:17:58.874242+00	2025-06-22 17:17:58.874242+00	\N
1650	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"mock-1\\"", "transactionData": {"fee": 2, "type": "cash-in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750612678948", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "mock-1"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	failure	invalid input syntax for type uuid: "mock-1"	\N	\N	2025-06-22 17:18:01.314058+00	2025-06-22 17:18:01.314058+00	\N
1651	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 17:31:14.289819+00	2025-06-22 17:31:14.289819+00	\N
1652	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 17:31:14.308839+00	2025-06-22 17:31:14.308839+00	\N
1653	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 17:34:15.608286+00	2025-06-22 17:34:15.608286+00	\N
1654	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 17:34:15.825416+00	2025-06-22 17:34:15.825416+00	\N
1655	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 17:35:32.091092+00	2025-06-22 17:35:32.091092+00	\N
1656	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 17:35:32.162853+00	2025-06-22 17:35:32.162853+00	\N
1657	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 17:49:49.148719+00	2025-06-22 17:49:49.148719+00	\N
1658	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 17:49:49.149388+00	2025-06-22 17:49:49.149388+00	\N
1659	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 19:22:26.490429+00	2025-06-22 19:22:26.490429+00	\N
1660	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 19:22:26.483541+00	2025-06-22 19:22:26.483541+00	\N
1661	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:22:41.836061+00	2025-06-22 19:22:41.836061+00	\N
1662	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750620162070", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-22 19:22:44.155216+00	2025-06-22 19:22:44.155216+00	\N
1663	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_deposit	abt-e8228551	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "2464402761018", "floatAffected": -1000, "glTransactionId": "c561c204-8f96-4633-a658-6d0ac17a8b69", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 19:23:40.604818+00	2025-06-22 19:23:40.604818+00	\N
1664	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 19:33:15.143768+00	2025-06-22 19:33:15.143768+00	\N
1665	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-out transaction for Jane Smith	{"fee": 10, "type": "cash-out", "amount": 2000, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 19:33:30.548643+00	2025-06-22 19:33:30.548643+00	\N
1666	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-out", "amount": 2000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750620810803", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-22 19:33:32.950783+00	2025-06-22 19:33:32.950783+00	\N
1667	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 19:39:40.484651+00	2025-06-22 19:39:40.484651+00	\N
1668	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 19:39:40.630306+00	2025-06-22 19:39:40.630306+00	\N
1669	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 19:51:07.424492+00	2025-06-22 19:51:07.424492+00	\N
1670	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 19:51:07.471696+00	2025-06-22 19:51:07.471696+00	\N
1671	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "Vodafone", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:51:23.708366+00	2025-06-22 19:51:23.708366+00	\N
1672	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750621884240", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-22 19:51:26.768792+00	2025-06-22 19:51:26.768792+00	\N
1673	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_package_received	jumia_transaction	PAC_1750622110523_616	jumia_package_received action on jumia_transaction	{"tracking_id": "23452345345234", "customer_name": "Jane Smith", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:55:15.666046+00	2025-06-22 19:55:15.666046+00	\N
1674	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_package_received	jumia_transaction	PAC_1750622110523_616	jumia_package_received action on jumia_transaction	{"tracking_id": "23452345345234", "customer_name": "Jane Smith", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:55:20.080518+00	2025-06-22 19:55:20.080518+00	\N
1675	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_package_receipt_completed	jumia_transaction	PAC_1750622110523_616	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "23452345345234", "customer_name": "Jane Smith", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:55:21.283442+00	2025-06-22 19:55:21.283442+00	\N
1676	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_processed	jumia_transaction	POD_1750622151829_253	jumia_pod_collection_processed action on jumia_transaction	{"amount": 320, "gl_posted": true, "tracking_id": "92394857", "total_debits": 320, "customer_name": "Jane Smith", "total_credits": 320, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:56:01.068514+00	2025-06-22 19:56:01.068514+00	\N
1677	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_processed	jumia_transaction	POD_1750622151829_253	jumia_pod_collection_processed action on jumia_transaction	{"amount": 320, "gl_posted": true, "tracking_id": "92394857", "total_debits": 320, "customer_name": "Jane Smith", "total_credits": 320, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:56:05.483743+00	2025-06-22 19:56:05.483743+00	\N
1678	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_completed	jumia_transaction	POD_1750622151829_253	Jumia pod_collection transaction completed successfully	{"amount": 320, "gl_posted": true, "tracking_id": "92394857", "customer_name": "Jane Smith", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:56:06.14822+00	2025-06-22 19:56:06.14822+00	\N
1679	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 19:56:16.837568+00	2025-06-22 19:56:16.837568+00	\N
1680	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 19:56:16.946714+00	2025-06-22 19:56:16.946714+00	\N
1682	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	4b0940e6-c4e9-4bdb-940b-c584c4d12436	Power sale completed - ECG - 9872938745 - GHS 200	{"amount": 200, "provider": "ecg", "reference": "PWR-1750622237340", "meter_number": "9872938745", "customer_name": "Salim", "customer_phone": "0574821675", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "243af67a-1cb7-4e76-a5be-b575a2d41a49"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:57:40.829823+00	2025-06-22 19:57:40.829823+00	\N
1684	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	4b0940e6-c4e9-4bdb-940b-c584c4d12436	Power sale transaction completed successfully	{"amount": 200, "provider": "ecg", "gl_posted": true, "reference": "PWR-1750622237340", "meter_number": "9872938745", "customer_name": "Salim", "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 19:57:51.127973+00	2025-06-22 19:57:51.127973+00	\N
1685	\N	Admin User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-0000-0000-000000000000	Development Branch	success	\N	\N	\N	2025-06-22 20:04:30.627501+00	2025-06-22 20:04:30.627501+00	\N
1686	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-22 20:04:30.764025+00	2025-06-22 20:04:30.764025+00	\N
1687	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-22 20:04:43.984491+00	2025-06-22 20:04:43.984491+00	\N
1688	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750622684404", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-22 20:04:46.488301+00	2025-06-22 20:04:46.488301+00	\N
1689	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 20:10:30.531077+00	2025-06-22 20:10:30.531077+00	\N
1690	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 20:10:31.584117+00	2025-06-22 20:10:31.584117+00	\N
1692	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 20:43:29.654491+00	2025-06-22 20:43:29.654491+00	\N
1691	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 20:43:29.661518+00	2025-06-22 20:43:29.661518+00	\N
1693	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 20:53:27.857517+00	2025-06-22 20:53:27.857517+00	\N
1694	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 20:53:27.887614+00	2025-06-22 20:53:27.887614+00	\N
1695	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-22 21:01:36.622983+00	2025-06-22 21:01:36.622983+00	\N
1696	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 10:20:39.949298+00	2025-06-23 10:20:39.949298+00	\N
1697	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 10:20:40.925933+00	2025-06-23 10:20:40.925933+00	\N
1699	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 10:30:23.006138+00	2025-06-23 10:30:23.006138+00	\N
1698	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 10:30:23.017656+00	2025-06-23 10:30:23.017656+00	\N
1700	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 10:31:05.735713+00	2025-06-23 10:31:05.735713+00	\N
1701	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 10:31:05.772589+00	2025-06-23 10:31:05.772589+00	\N
1702	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 2, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 10:31:19.043011+00	2025-06-23 10:31:19.043011+00	\N
1703	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 2, "type": "cash-in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750674679264", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 10:31:21.097104+00	2025-06-23 10:31:21.097104+00	\N
1704	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 2, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 10:31:35.006308+00	2025-06-23 10:31:35.006308+00	\N
1705	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 2, "type": "cash-in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750674695228", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 10:31:36.961081+00	2025-06-23 10:31:36.961081+00	\N
1706	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 15:27:08.606194+00	2025-06-23 15:27:08.606194+00	\N
1707	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 15:27:09.735216+00	2025-06-23 15:27:09.735216+00	\N
1708	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 15:27:34.796023+00	2025-06-23 15:27:34.796023+00	\N
1709	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750692455515", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 15:27:37.21027+00	2025-06-23 15:27:37.21027+00	\N
1711	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	admin@mimhaad.com	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 15:36:46.581639+00	2025-06-23 15:36:46.581639+00	\N
1710	00000000-0000-4000-8000-000000000001	System User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	00000000-0000-4000-8000-000000000002	Main Branch	success	\N	\N	\N	2025-06-23 15:36:46.580718+00	2025-06-23 15:36:46.580718+00	\N
1712	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	admin@mimhaad.com	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Salim	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 15:37:01.594321+00	2025-06-23 15:37:01.594321+00	\N
1713	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	admin@mimhaad.com	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"admin@mimhaad.com\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750693022249", "phone_number": "0549514616", "processed_by": "admin@mimhaad.com", "customer_name": "Salim", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "admin@mimhaad.com"	\N	\N	2025-06-23 15:37:03.607834+00	2025-06-23 15:37:03.607834+00	\N
1714	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 19:47:39.473161+00	2025-06-23 19:47:39.473161+00	\N
1715	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 19:47:39.480998+00	2025-06-23 19:47:39.480998+00	\N
1716	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_deposit	abt-da10e1fa	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "2464402761018", "floatAffected": -1000, "glTransactionId": "f9109dd8-b1a0-49da-9964-89e158f737e7", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:06:17.208822+00	2025-06-23 20:06:17.208822+00	\N
1717	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:07:39.635235+00	2025-06-23 20:07:39.635235+00	\N
1718	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 20:07:39.690715+00	2025-06-23 20:07:39.690715+00	\N
1719	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_interbank	abt-87f1ccb4	agency_banking_interbank transaction create: GHS 1000	{"fee": 10, "action": "create", "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Abdul Kadir", "accountNumber": "78249248872432", "floatAffected": 1000, "glTransactionId": "23091a83-db90-40c4-ad29-b3fd2693c623", "transactionType": "agency_banking_interbank", "cashTillAffected": 1010}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:26:06.858523+00	2025-06-23 20:26:06.858523+00	\N
1720	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_deposit	abt-11542245	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "", "partnerBank": "GCB", "customerName": "Jane Smith", "accountNumber": "2464402761018", "floatAffected": -1000, "glTransactionId": "26b2da0e-ead2-4804-8751-86334313167e", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:28:11.583075+00	2025-06-23 20:28:11.583075+00	\N
1721	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_deposit	abt-a4e5003f	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "298628729202", "floatAffected": -1000, "glTransactionId": "d352a257-9a8b-489f-ba1b-a4e34420fe57", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:39:40.894191+00	2025-06-23 20:39:40.894191+00	\N
1722	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_interbank	abt-cec083ad	agency_banking_interbank transaction create: GHS 2000	{"fee": 20, "action": "create", "amount": 2000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Abdul Kadir", "accountNumber": "78249248872432", "floatAffected": -2000, "glTransactionId": "ed5c74b2-f29c-477d-b8ac-78a6383bf8a5", "transactionType": "agency_banking_interbank", "cashTillAffected": 2020}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:41:03.805438+00	2025-06-23 20:41:03.805438+00	\N
1723	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:43:20.29841+00	2025-06-23 20:43:20.29841+00	\N
1724	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 20:43:20.299834+00	2025-06-23 20:43:20.299834+00	\N
1725	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Ibrahim Hardi	{"fee": 5, "type": "cash-in", "amount": 500, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Ibrahim Hardi"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 20:43:41.310222+00	2025-06-23 20:43:41.310222+00	\N
1726	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 5, "type": "cash-in", "amount": 500, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750711420851", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 20:43:43.731645+00	2025-06-23 20:43:43.731645+00	\N
1727	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_processed	jumia_transaction	POD_1750713408472_342	jumia_pod_collection_processed action on jumia_transaction	{"amount": 500, "gl_posted": true, "tracking_id": "6298734798298", "total_debits": 500, "customer_name": "Abdul Razak", "total_credits": 500, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-23 21:17:02.139979+00	2025-06-23 21:17:02.139979+00	\N
1728	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_processed	jumia_transaction	POD_1750713408472_342	jumia_pod_collection_processed action on jumia_transaction	{"amount": 500, "gl_posted": true, "tracking_id": "6298734798298", "total_debits": 500, "customer_name": "Abdul Razak", "total_credits": 500, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-23 21:17:10.46455+00	2025-06-23 21:17:10.46455+00	\N
1729	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_completed	jumia_transaction	POD_1750713408472_342	Jumia pod_collection transaction completed successfully	{"amount": 500, "gl_posted": true, "tracking_id": "6298734798298", "customer_name": "Abdul Razak", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-23 21:17:11.664423+00	2025-06-23 21:17:11.664423+00	\N
1730	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_processed	jumia_transaction	POD_1750713486638_658	jumia_pod_collection_processed action on jumia_transaction	{"amount": 301, "gl_posted": true, "tracking_id": "729348598734", "total_debits": 301, "customer_name": "Mohammed Hassen", "total_credits": 301, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-23 21:18:19.786247+00	2025-06-23 21:18:19.786247+00	\N
1731	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_processed	jumia_transaction	POD_1750713486638_658	jumia_pod_collection_processed action on jumia_transaction	{"amount": 301, "gl_posted": true, "tracking_id": "729348598734", "total_debits": 301, "customer_name": "Mohammed Hassen", "total_credits": 301, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-23 21:18:24.953384+00	2025-06-23 21:18:24.953384+00	\N
1732	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	jumia_pod_collection_completed	jumia_transaction	POD_1750713486638_658	Jumia pod_collection transaction completed successfully	{"amount": 301, "gl_posted": true, "tracking_id": "729348598734", "customer_name": "Mohammed Hassen", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-23 21:18:25.769511+00	2025-06-23 21:18:25.769511+00	\N
1733	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 21:20:46.42169+00	2025-06-23 21:20:46.42169+00	\N
1734	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Ibrahim Hardi	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0240388114", "customer_name": "Ibrahim Hardi"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 21:21:09.337919+00	2025-06-23 21:21:09.337919+00	\N
1735	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750713668930", "phone_number": "0240388114", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 21:21:12.028618+00	2025-06-23 21:21:12.028618+00	\N
1736	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 21:21:41.558125+00	2025-06-23 21:21:41.558125+00	\N
1737	\N	Development User	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	\N	Development Branch	success	\N	\N	\N	2025-06-23 21:21:41.573363+00	2025-06-23 21:21:41.573363+00	\N
1738	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 21:46:17.768638+00	2025-06-23 21:46:17.768638+00	\N
1761	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 09:39:06.337548+00	2025-06-24 09:39:06.337548+00	\N
1739	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Salim	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 21:46:42.104363+00	2025-06-23 21:46:42.104363+00	\N
1740	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750715201729", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Salim", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 21:46:44.559204+00	2025-06-23 21:46:44.559204+00	\N
1741	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 21:48:20.067733+00	2025-06-23 21:48:20.067733+00	\N
1742	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:02:30.54284+00	2025-06-23 22:02:30.54284+00	\N
1743	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 1, "type": "cash-in", "amount": 100, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:02:46.424694+00	2025-06-23 22:02:46.424694+00	\N
1744	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 1, "type": "cash-in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750716166176", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 22:02:49.635758+00	2025-06-23 22:02:49.635758+00	\N
1745	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:06:39.716469+00	2025-06-23 22:06:39.716469+00	\N
1746	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0248142134", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:06:55.951713+00	2025-06-23 22:06:55.951713+00	\N
1747	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750716415625", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 22:06:58.594441+00	2025-06-23 22:06:58.594441+00	\N
1748	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:11:30.799543+00	2025-06-23 22:11:30.799543+00	\N
1749	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for MOHAMMED SALIM ABDUL-MAJEED	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0554899202", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:11:46.026882+00	2025-06-23 22:11:46.026882+00	\N
1750	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750716705679", "phone_number": "0554899202", "processed_by": "System", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 22:11:48.700938+00	2025-06-23 22:11:48.700938+00	\N
1751	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:12:31.089774+00	2025-06-23 22:12:31.089774+00	\N
1752	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Abdul Kadir	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0248142134", "customer_name": "Abdul Kadir"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-23 22:12:44.174636+00	2025-06-23 22:12:44.174636+00	\N
1753	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750716763827", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Abdul Kadir", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-23 22:12:46.52817+00	2025-06-23 22:12:46.52817+00	\N
1754	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 07:15:47.46631+00	2025-06-24 07:15:47.46631+00	\N
1755	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 07:46:21.577571+00	2025-06-24 07:46:21.577571+00	\N
1756	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 08:25:58.597305+00	2025-06-24 08:25:58.597305+00	\N
1757	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 08:27:33.528976+00	2025-06-24 08:27:33.528976+00	\N
1758	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	transaction_create	agency_banking_deposit	abt-a93e52ab	agency_banking_deposit transaction create: GHS 200	{"fee": 0, "action": "create", "amount": 200, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "298628729202", "floatAffected": -200, "glTransactionId": "03cf7d1d-6e4e-48ef-baca-eb885fe7bb28", "transactionType": "agency_banking_deposit", "cashTillAffected": 200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 08:29:12.244929+00	2025-06-24 08:29:12.244929+00	\N
1759	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 08:49:00.389482+00	2025-06-24 08:49:00.389482+00	\N
1760	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 08:57:58.847914+00	2025-06-24 08:57:58.847914+00	\N
1762	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 09:39:07.809871+00	2025-06-24 09:39:07.809871+00	\N
1763	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Abdul Kadir	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Abdul Kadir"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 09:39:30.400189+00	2025-06-24 09:39:30.400189+00	\N
1764	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750757969887", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Abdul Kadir", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 09:39:32.414737+00	2025-06-24 09:39:32.414737+00	\N
1765	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Abdul Kadir	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Abdul Kadir"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 11:07:51.487227+00	2025-06-24 11:07:51.487227+00	\N
1766	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750763271125", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Abdul Kadir", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 11:07:54.094832+00	2025-06-24 11:07:54.094832+00	\N
1767	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for kanslkdf	{"fee": 0, "type": "cash-in", "amount": 266, "provider": "MTN", "phone_number": "0235478965", "customer_name": "kanslkdf"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 11:10:39.300749+00	2025-06-24 11:10:39.300749+00	\N
1768	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash-in", "amount": 266, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750763438851", "phone_number": "0235478965", "processed_by": "System", "customer_name": "kanslkdf", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 11:10:40.510641+00	2025-06-24 11:10:40.510641+00	\N
1769	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 11:57:14.456968+00	2025-06-24 11:57:14.456968+00	\N
1770	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 11:57:33.141962+00	2025-06-24 11:57:33.141962+00	\N
1771	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750766252808", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 11:57:35.2092+00	2025-06-24 11:57:35.2092+00	\N
1772	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 11:58:05.49212+00	2025-06-24 11:58:05.49212+00	\N
1773	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750766285156", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 11:58:07.618523+00	2025-06-24 11:58:07.618523+00	\N
1774	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 12:05:09.343109+00	2025-06-24 12:05:09.343109+00	\N
1775	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	page_access	system_access	\N	User accessed momo_transactions_page	\N	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 12:29:43.6271+00	2025-06-24 12:29:43.6271+00	\N
1776	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 12:30:00.225128+00	2025-06-24 12:30:00.225128+00	\N
1777	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 10, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750768199927", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 12:30:02.390513+00	2025-06-24 12:30:02.390513+00	\N
1778	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for MOHAMMED SALIM ABDUL-MAJEED	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 14:08:53.594458+00	2025-06-24 14:08:53.594458+00	\N
1779	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750774130757", "phone_number": "0549514616", "processed_by": "System", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 14:08:55.860805+00	2025-06-24 14:08:55.860805+00	\N
1780	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_out transaction for Jane Smith	{"fee": 0, "type": "cash_out", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 14:23:10.615727+00	2025-06-24 14:23:10.615727+00	\N
1781	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_out", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750774987752", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 14:23:12.734312+00	2025-06-24 14:23:12.734312+00	\N
1783	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	cfd02a2f-b349-4efe-b90c-72ef0e3e0092	Power sale completed - NEDCO - 6546545 - GHS 1000	{"amount": 1000, "provider": "nedco", "reference": "PWR-1750779543814", "meter_number": "6546545", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "customer_phone": "0549514616", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "d1a2470c-3528-426e-afd5-b40d0f2ba9ca"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 15:39:19.553935+00	2025-06-24 15:39:19.553935+00	\N
1785	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	cfd02a2f-b349-4efe-b90c-72ef0e3e0092	Power sale transaction completed successfully	{"amount": 1000, "provider": "nedco", "gl_posted": true, "reference": "PWR-1750779543814", "meter_number": "6546545", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 15:39:28.083342+00	2025-06-24 15:39:28.083342+00	\N
1786	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 16:07:11.081877+00	2025-06-24 16:07:11.081877+00	\N
1787	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750781228469", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 16:07:13.317648+00	2025-06-24 16:07:13.317648+00	\N
1788	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/d479d8ff-e7be-4c2d-ad72-666e3b4f2f25:194:33)\\n    at async Module.POST (blob:https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/ea5cb5d4-864a-4e0c-94c9-b01a9acac4f4:90:29)\\n    at async Z (https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/_next/static/chunks/3162-6858603600ce75b3.js?dpl=dpl_36xGYm6Yi83GHr1ymez4qsYE2wW1:1:5584)\\n    at async globalThis.fetch (https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/_next/static/chunks/3162-6858603600ce75b3.js?dpl=dpl_36xGYm6Yi83GHr1ymez4qsYE2wW1:1:6616)\\n    at async onSubmit (blob:https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/bd523f34-7b21-437c-8753-3f865cf832a3:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750781228469", "branchName": "Hill Top Branch", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 16:07:15.062602+00	2025-06-24 16:07:15.062602+00	\N
1789	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_failed	power_transaction	\N	Power sale failed - ECG - 6546545 - GHS 1000	{"amount": 1000, "provider": "ecg", "reference": "PWR-1750781268173", "meter_number": "6546545", "error_message": "Insufficient power float balance for ECG. Available: 420, Required: 1000", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:07:50.438338+00	2025-06-24 16:07:50.438338+00	\N
1790	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_failed	power_transaction	\N	Power sale failed - NEDCO - 6546545 - GHS 1000	{"amount": 1000, "provider": "nedco", "reference": "PWR-1750781285083", "meter_number": "6546545", "error_message": "Insufficient power float balance for NEDCO. Available: 0, Required: 1000", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:08:07.309241+00	2025-06-24 16:08:07.309241+00	\N
1791	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Abdul Kadir	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Abdul Kadir"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 16:14:30.089891+00	2025-06-24 16:14:30.089891+00	\N
1792	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750781667467", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Abdul Kadir", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 16:14:32.239895+00	2025-06-24 16:14:32.239895+00	\N
1804	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_gl_posted	power_transaction	fa73c750-58d0-4935-b736-6f554c723786	power_sale_gl_posted action on power_transaction	{"amount": 200, "provider": "nedco", "meter_number": "6546545", "customer_name": "Jane Smith", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 19:11:24.045064+00	2025-06-24 19:11:24.045064+00	\N
1805	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	fa73c750-58d0-4935-b736-6f554c723786	Power sale transaction completed successfully	{"amount": 200, "provider": "nedco", "gl_posted": true, "reference": "PWR-1750792256510", "meter_number": "6546545", "customer_name": "Jane Smith", "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 19:11:25.337014+00	2025-06-24 19:11:25.337014+00	\N
1806	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_out transaction for Jane Smith	{"fee": 0, "type": "cash_out", "amount": 1000, "provider": "Vodafone", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 19:12:13.673613+00	2025-06-24 19:12:13.673613+00	\N
1958	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	f5afc758-2eee-4f6d-ab92-c7804932e7c6	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0547910720", "customer_name": "Ibrahim Hardi"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 11:23:19.137905+00	2025-06-28 11:23:19.137905+00	\N
1793	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/d479d8ff-e7be-4c2d-ad72-666e3b4f2f25:194:33)\\n    at async Module.POST (blob:https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/ea5cb5d4-864a-4e0c-94c9-b01a9acac4f4:90:29)\\n    at async Z (https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/_next/static/chunks/3162-6858603600ce75b3.js?dpl=dpl_36xGYm6Yi83GHr1ymez4qsYE2wW1:1:5584)\\n    at async globalThis.fetch (https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/_next/static/chunks/3162-6858603600ce75b3.js?dpl=dpl_36xGYm6Yi83GHr1ymez4qsYE2wW1:1:6616)\\n    at async onSubmit (blob:https://kzmokiusdcvte08qtx7c.lite.vusercontent.net/bd523f34-7b21-437c-8753-3f865cf832a3:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750781667467", "branchName": "Hill Top Branch", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Abdul Kadir", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 16:14:34.317183+00	2025-06-24 16:14:34.317183+00	\N
1794	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_gl_posted	power_transaction	bde41781-0178-4b1e-9bf7-e24b6da73325	power_sale_gl_posted action on power_transaction	{"amount": 100, "provider": "ecg", "meter_number": "6546545", "customer_name": "Majeed Ayisha", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:19:35.718431+00	2025-06-24 16:19:35.718431+00	\N
1795	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	bde41781-0178-4b1e-9bf7-e24b6da73325	Power sale completed - ECG - 6546545 - GHS 100	{"amount": 100, "provider": "ecg", "reference": "PWR-1750781961501", "meter_number": "6546545", "customer_name": "Majeed Ayisha", "customer_phone": "0506068893", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "243af67a-1cb7-4e76-a5be-b575a2d41a49"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:19:36.791866+00	2025-06-24 16:19:36.791866+00	\N
1796	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_gl_posted	power_transaction	bde41781-0178-4b1e-9bf7-e24b6da73325	power_sale_gl_posted action on power_transaction	{"amount": 100, "provider": "ecg", "meter_number": "6546545", "customer_name": "Majeed Ayisha", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:19:44.385005+00	2025-06-24 16:19:44.385005+00	\N
1797	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	bde41781-0178-4b1e-9bf7-e24b6da73325	Power sale transaction completed successfully	{"amount": 100, "provider": "ecg", "gl_posted": true, "reference": "PWR-1750781961501", "meter_number": "6546545", "customer_name": "Majeed Ayisha", "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:19:45.477745+00	2025-06-24 16:19:45.477745+00	\N
1798	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_failed	power_transaction	\N	Power sale failed - NEDCO - 65465457234 - GHS 200	{"amount": 200, "provider": "nedco", "reference": "PWR-1750782017474", "meter_number": "65465457234", "error_message": "Insufficient power float balance for NEDCO. Available: 0, Required: 200", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 16:20:19.808497+00	2025-06-24 16:20:19.808497+00	\N
1799	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "MTN", "phone_number": "0248142134", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 19:03:36.187834+00	2025-06-24 19:03:36.187834+00	\N
1800	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750791812394", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:03:38.717335+00	2025-06-24 19:03:38.717335+00	\N
1801	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/c149b242-1355-427b-8b7f-a7d7be3406e1:194:33)\\n    at async Module.POST (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/8012f5bc-d5d0-424c-9949-cafeb28c94f9:90:29)\\n    at async Y (https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_7nXPPbZPUWjP6iAawRVhyByMHEHS:1:6031)\\n    at async globalThis.fetch (https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_7nXPPbZPUWjP6iAawRVhyByMHEHS:1:7065)\\n    at async onSubmit (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/74c84d4b-1484-4094-b9c0-55e1ffcf1572:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750791812394", "branchName": "Hill Top Branch", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:03:40.826268+00	2025-06-24 19:03:40.826268+00	\N
1802	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_gl_posted	power_transaction	fa73c750-58d0-4935-b736-6f554c723786	power_sale_gl_posted action on power_transaction	{"amount": 200, "provider": "nedco", "meter_number": "6546545", "customer_name": "Jane Smith", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 19:11:14.01468+00	2025-06-24 19:11:14.01468+00	\N
1803	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	fa73c750-58d0-4935-b736-6f554c723786	Power sale completed - NEDCO - 6546545 - GHS 200	{"amount": 200, "provider": "nedco", "reference": "PWR-1750792256510", "meter_number": "6546545", "customer_name": "Jane Smith", "customer_phone": "0574821675", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "d1a2470c-3528-426e-afd5-b40d0f2ba9ca"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 19:11:15.294323+00	2025-06-24 19:11:15.294323+00	\N
1807	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_out", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750792329900", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:12:16.19043+00	2025-06-24 19:12:16.19043+00	\N
1808	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/da7409b3-2aec-4b19-99d5-17bc5b6fda97:194:33)\\n    at async Module.POST (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/3bd290e6-ff50-4eb9-a252-5f512b594340:90:29)\\n    at async Y (https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_7nXPPbZPUWjP6iAawRVhyByMHEHS:1:6031)\\n    at async globalThis.fetch (https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_7nXPPbZPUWjP6iAawRVhyByMHEHS:1:7065)\\n    at async onSubmit (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/185aa04f-824d-430c-8d78-4d5353d8c915:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_out", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750792329900", "branchName": "Hill Top Branch", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:12:18.265075+00	2025-06-24 19:12:18.265075+00	\N
1809	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for MOHAMMED SALIM ABDUL-MAJEED	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 19:15:05.620244+00	2025-06-24 19:15:05.620244+00	\N
1810	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750792501023", "phone_number": "5027599206", "processed_by": "System", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:15:09.198599+00	2025-06-24 19:15:09.198599+00	\N
1811	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/b3e9355d-be9c-4891-a709-ce6468c14429:194:33)\\n    at async Module.POST (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/5c289cb3-5ace-4939-9839-eb3a8d90304c:90:29)\\n    at async Y (https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_7nXPPbZPUWjP6iAawRVhyByMHEHS:1:6031)\\n    at async globalThis.fetch (https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_7nXPPbZPUWjP6iAawRVhyByMHEHS:1:7065)\\n    at async onSubmit (blob:https://kzmpgtir84uo19a2glm5.lite.vusercontent.net/e5c5dfe4-d8e1-4031-99ce-c55e17c6fb8a:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750792501023", "branchName": "Hill Top Branch", "phone_number": "5027599206", "processed_by": "System", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:15:11.311543+00	2025-06-24 19:15:11.311543+00	\N
1812	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 19:38:28.78813+00	2025-06-24 19:38:28.78813+00	\N
1813	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	transaction_failure	transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750793905186", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:38:31.188498+00	2025-06-24 19:38:31.188498+00	\N
1823	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750797726354", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Mohammed Salim Abdul-Majeed", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:42:09.794328+00	2025-06-24 20:42:09.794328+00	\N
1832	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750799174526", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:06:18.210415+00	2025-06-24 21:06:18.210415+00	\N
1814	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpms68ks8voimv23hy.lite.vusercontent.net/c6282dec-9833-451f-92b1-312445e1511e:194:33)\\n    at async Module.POST (blob:https://kzmpms68ks8voimv23hy.lite.vusercontent.net/1618dfc8-59b0-4530-afc1-5c953230ba47:90:29)\\n    at async Y (https://kzmpms68ks8voimv23hy.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_FrL2nkuDniGoQiwE4VeX5az8TnDU:1:6031)\\n    at async globalThis.fetch (https://kzmpms68ks8voimv23hy.lite.vusercontent.net/_next/static/chunks/3162-d69f91d025040933.js?dpl=dpl_FrL2nkuDniGoQiwE4VeX5az8TnDU:1:7065)\\n    at async onSubmit (blob:https://kzmpms68ks8voimv23hy.lite.vusercontent.net/d3c8dae4-2a29-4c63-ad86-a5ba83a460eb:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750793905186", "branchName": "Hill Top Branch", "phone_number": "0554899202", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:38:33.138532+00	2025-06-24 19:38:33.138532+00	\N
1815	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 19:57:14.05811+00	2025-06-24 19:57:14.05811+00	\N
1816	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750795032558", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:57:15.640367+00	2025-06-24 19:57:15.640367+00	\N
1817	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmjubilotgqmtkif41w.lite.vusercontent.net/d420a55f-7dd1-4a94-9973-df8d476f48f7:47:28)\\n    at async Module.POST (blob:https://kzmjubilotgqmtkif41w.lite.vusercontent.net/68c163d0-52bf-4298-9fc0-abd033c7ad83:90:29)\\n    at async Y (https://kzmjubilotgqmtkif41w.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_7xN8WELwUrac3fbJV8PxUD6XByNK:1:6031)\\n    at async globalThis.fetch (https://kzmjubilotgqmtkif41w.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_7xN8WELwUrac3fbJV8PxUD6XByNK:1:7065)\\n    at async onSubmit (blob:https://kzmjubilotgqmtkif41w.lite.vusercontent.net/0cdf69e7-dff2-4e76-a9e0-0ac439a2b9cd:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750795032558", "branchName": "Hill Top Branch", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 19:57:16.437355+00	2025-06-24 19:57:16.437355+00	\N
1819	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 20:22:36.604951+00	2025-06-24 20:22:36.604951+00	\N
1820	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750796555099", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:22:38.315469+00	2025-06-24 20:22:38.315469+00	\N
1821	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmm084gwl120offdnw8.lite.vusercontent.net/b7291bfa-7d2e-4934-bb74-1309d120dbbd:47:28)\\n    at async Module.POST (blob:https://kzmm084gwl120offdnw8.lite.vusercontent.net/077c335f-1b90-45bd-a009-bf617ce9efea:90:29)\\n    at async Y (https://kzmm084gwl120offdnw8.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:6031)\\n    at async globalThis.fetch (https://kzmm084gwl120offdnw8.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:7065)\\n    at async onSubmit (blob:https://kzmm084gwl120offdnw8.lite.vusercontent.net/2a27c80a-fb5e-4a1c-89b4-9a8f9af5a930:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750796555099", "branchName": "Hill Top Branch", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:22:39.209587+00	2025-06-24 20:22:39.209587+00	\N
1822	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Mohammed Salim Abdul-Majeed	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Mohammed Salim Abdul-Majeed"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 20:42:07.825861+00	2025-06-24 20:42:07.825861+00	\N
1824	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmphp1p3fosuqsrwndf.lite.vusercontent.net/6f29e9fc-b3d3-4736-845c-c499bc81c784:47:28)\\n    at async Module.POST (blob:https://kzmphp1p3fosuqsrwndf.lite.vusercontent.net/6183b622-a26d-46ec-8ae3-5e8eabc32a7c:90:29)\\n    at async Y (https://kzmphp1p3fosuqsrwndf.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:6031)\\n    at async globalThis.fetch (https://kzmphp1p3fosuqsrwndf.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:7065)\\n    at async onSubmit (blob:https://kzmphp1p3fosuqsrwndf.lite.vusercontent.net/5dd97590-3e57-4931-9f9b-0f2b1b089ef8:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750797726354", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Mohammed Salim Abdul-Majeed", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:42:10.623067+00	2025-06-24 20:42:10.623067+00	\N
1825	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Ibrahim Hardi	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Ibrahim Hardi"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 20:53:13.521383+00	2025-06-24 20:53:13.521383+00	\N
1826	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750798392034", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:53:15.174367+00	2025-06-24 20:53:15.174367+00	\N
1827	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/c46f03cf-0e77-4566-a121-cce0f51ca4ed:47:28)\\n    at async Module.POST (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/d7783cd4-cddc-45ef-88b5-4ce4a566d17f:90:29)\\n    at async Y (https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:6031)\\n    at async globalThis.fetch (https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:7065)\\n    at async onSubmit (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/dece0eb2-41a6-4eb0-a07f-ef8de1ddd744:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750798392034", "branchName": "Hill Top Branch", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:53:15.955132+00	2025-06-24 20:53:15.955132+00	\N
1828	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Ibrahim Hardi	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "Vodafone", "phone_number": "0240388114", "customer_name": "Ibrahim Hardi"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 20:57:59.184192+00	2025-06-24 20:57:59.184192+00	\N
1829	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750798660293", "phone_number": "0240388114", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:58:00.931365+00	2025-06-24 20:58:00.931365+00	\N
1830	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/53977f54-5568-4137-aeb8-c8eade0bffc8:47:28)\\n    at async Module.POST (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/43d44867-0c7b-4889-9b53-2a2547860a8e:90:29)\\n    at async Y (https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:6031)\\n    at async globalThis.fetch (https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:7065)\\n    at async onSubmit (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/acde5d46-bea4-4f14-a898-8b9414661d26:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750798660293", "branchName": "Hill Top Branch", "phone_number": "0240388114", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 20:58:01.757786+00	2025-06-24 20:58:01.757786+00	\N
1831	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Vodafone", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 21:06:16.085458+00	2025-06-24 21:06:16.085458+00	\N
1833	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/53977f54-5568-4137-aeb8-c8eade0bffc8:47:28)\\n    at async Module.POST (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/43d44867-0c7b-4889-9b53-2a2547860a8e:90:29)\\n    at async Y (https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:6031)\\n    at async globalThis.fetch (https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/_next/static/chunks/3162-a2e2e522baa98a95.js?dpl=dpl_1F83Z1W2AT1N1BvrwQpgcSBAJQt3:1:7065)\\n    at async onSubmit (blob:https://kzml7pcuc2f51z4wtx68.lite.vusercontent.net/acde5d46-bea4-4f14-a898-8b9414661d26:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750799174526", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:06:19.177621+00	2025-06-24 21:06:19.177621+00	\N
1834	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Ibrahim Hardi	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Ibrahim Hardi"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 21:15:37.614647+00	2025-06-24 21:15:37.614647+00	\N
1835	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750799736078", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:15:39.59394+00	2025-06-24 21:15:39.59394+00	\N
1836	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmoa85f5nbvqj1r8gfm.lite.vusercontent.net/4933c289-12ff-40ac-9799-ed9a3c372ea5:47:28)\\n    at async Module.POST (blob:https://kzmoa85f5nbvqj1r8gfm.lite.vusercontent.net/7bc5de8d-5871-44e2-bab7-ccdc9e9f6348:114:29)\\n    at async Y (https://kzmoa85f5nbvqj1r8gfm.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:6031)\\n    at async globalThis.fetch (https://kzmoa85f5nbvqj1r8gfm.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:7065)\\n    at async onSubmit (blob:https://kzmoa85f5nbvqj1r8gfm.lite.vusercontent.net/0d3d3450-dc26-4f31-89a1-eec95f781089:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Vodafone", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750799736078", "branchName": "Hill Top Branch", "phone_number": "5027599206", "processed_by": "System", "customer_name": "Ibrahim Hardi", "float_account_id": "141439f2-e534-45e7-9a3c-0b856cecfdad"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:15:40.567478+00	2025-06-24 21:15:40.567478+00	\N
1837	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_gl_posted	power_transaction	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	power_sale_gl_posted action on power_transaction	{"amount": 200, "provider": "ecg", "meter_number": "6546545", "customer_name": "Salim", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 21:31:34.208107+00	2025-06-24 21:31:34.208107+00	\N
1838	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	Power sale completed - ECG - 6546545 - GHS 200	{"amount": 200, "provider": "ecg", "reference": "PWR-1750800674376", "meter_number": "6546545", "customer_name": "Salim", "customer_phone": "0201234567", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "243af67a-1cb7-4e76-a5be-b575a2d41a49"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 21:31:35.687666+00	2025-06-24 21:31:35.687666+00	\N
1839	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_gl_posted	power_transaction	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	power_sale_gl_posted action on power_transaction	{"amount": 200, "provider": "ecg", "meter_number": "6546545", "customer_name": "Salim", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 21:31:46.682352+00	2025-06-24 21:31:46.682352+00	\N
1840	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System Administratorr	power_sale_completed	power_transaction	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	Power sale transaction completed successfully	{"amount": 200, "provider": "ecg", "gl_posted": true, "reference": "PWR-1750800674376", "meter_number": "6546545", "customer_name": "Salim", "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-24 21:31:48.353077+00	2025-06-24 21:31:48.353077+00	\N
1841	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Z-Pay", "phone_number": "0248142134", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 21:32:23.684199+00	2025-06-24 21:32:23.684199+00	\N
1842	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750800742139", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:32:25.669719+00	2025-06-24 21:32:25.669719+00	\N
1859	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Mohammed Salim	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Mohammed Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 08:59:26.069109+00	2025-06-25 08:59:26.069109+00	\N
1843	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmkm4u5jd5eeueyca4t.lite.vusercontent.net/4090e3e0-112f-47c8-a54b-8f2317fd488f:47:28)\\n    at async Module.POST (blob:https://kzmkm4u5jd5eeueyca4t.lite.vusercontent.net/56f119eb-ba56-4cce-bb31-8e14931297a9:114:29)\\n    at async Y (https://kzmkm4u5jd5eeueyca4t.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:6031)\\n    at async globalThis.fetch (https://kzmkm4u5jd5eeueyca4t.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:7065)\\n    at async onSubmit (blob:https://kzmkm4u5jd5eeueyca4t.lite.vusercontent.net/3d7f33c9-d8cf-4461-8296-5312155a4a63:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750800742139", "branchName": "Hill Top Branch", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:32:26.643257+00	2025-06-24 21:32:26.643257+00	\N
1844	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Mohammed Salim Abdul-Majeed	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Mohammed Salim Abdul-Majeed"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 21:45:27.514553+00	2025-06-24 21:45:27.514553+00	\N
1845	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750801525993", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Mohammed Salim Abdul-Majeed", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:45:29.489601+00	2025-06-24 21:45:29.489601+00	\N
1846	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmkm5fgdzg4w7iqxjs4.lite.vusercontent.net/b4733388-167a-42a8-ad72-7756a3bc53f1:47:28)\\n    at async Module.POST (blob:https://kzmkm5fgdzg4w7iqxjs4.lite.vusercontent.net/2f5447cb-3aff-493b-8868-7e4930b61524:114:29)\\n    at async Y (https://kzmkm5fgdzg4w7iqxjs4.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:6031)\\n    at async globalThis.fetch (https://kzmkm5fgdzg4w7iqxjs4.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:7065)\\n    at async onSubmit (blob:https://kzmkm5fgdzg4w7iqxjs4.lite.vusercontent.net/a5ef4d02-7a07-4f42-aeac-241cdc3f67ad:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750801525993", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Mohammed Salim Abdul-Majeed", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:45:30.748487+00	2025-06-24 21:45:30.748487+00	\N
1847	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-24 21:55:15.327586+00	2025-06-24 21:55:15.327586+00	\N
1848	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750802113547", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:55:18.291252+00	2025-06-24 21:55:18.291252+00	\N
1849	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpm4an3aex13zw7be3.lite.vusercontent.net/ea341b99-eba1-4035-bc35-d6511b344fa1:47:28)\\n    at async Module.POST (blob:https://kzmpm4an3aex13zw7be3.lite.vusercontent.net/ab0a17a8-4929-4252-9acb-097ed991cc97:113:29)\\n    at async Y (https://kzmpm4an3aex13zw7be3.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:6031)\\n    at async globalThis.fetch (https://kzmpm4an3aex13zw7be3.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_6R38jPU3BnCRPM6Ftmuc9DERtFqT:1:7065)\\n    at async onSubmit (blob:https://kzmpm4an3aex13zw7be3.lite.vusercontent.net/15f9f0df-8a0c-45c3-8a63-39b0e86af180:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750802113547", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-24 21:55:19.766982+00	2025-06-24 21:55:19.766982+00	\N
1850	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "Z-Pay", "phone_number": "0248142134", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 08:27:48.535892+00	2025-06-25 08:27:48.535892+00	\N
1851	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750840067110", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-25 08:27:49.962275+00	2025-06-25 08:27:49.962275+00	\N
1852	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/5c0dc2d3-6c9b-4eb5-8be7-7cd2d95ed283:47:28)\\n    at async Module.POST (blob:https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/130c3576-b952-4214-9ece-7e4131bef6f8:114:29)\\n    at async Y (https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/f2be67f4-1546-4ae4-b7be-d62fba3b7a7a:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750840067110", "branchName": "Hill Top Branch", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-25 08:27:50.690289+00	2025-06-25 08:27:50.690289+00	\N
1853	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "Z-Pay", "phone_number": "0248142134", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 08:33:02.69778+00	2025-06-25 08:33:02.69778+00	\N
1854	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750840381271", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-25 08:33:04.091502+00	2025-06-25 08:33:04.091502+00	\N
1855	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	System	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"System\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"System\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/5c0dc2d3-6c9b-4eb5-8be7-7cd2d95ed283:47:28)\\n    at async Module.POST (blob:https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/130c3576-b952-4214-9ece-7e4131bef6f8:114:29)\\n    at async Y (https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmpcgsoaenit74dgq4k.lite.vusercontent.net/f2be67f4-1546-4ae4-b7be-d62fba3b7a7a:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "System", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750840381271", "branchName": "Hill Top Branch", "phone_number": "0248142134", "processed_by": "System", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "System"	\N	\N	2025-06-25 08:33:04.78208+00	2025-06-25 08:33:04.78208+00	\N
1856	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 08:47:06.707775+00	2025-06-25 08:47:06.707775+00	\N
1857	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"Mohammed\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750841225334", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "Mohammed"	\N	\N	2025-06-25 08:47:08.146987+00	2025-06-25 08:47:08.146987+00	\N
1858	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"Mohammed\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"Mohammed\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmgirinpzugl3p9aa8d.lite.vusercontent.net/e2118640-d1fe-4a65-b10f-dd141dc57846:47:28)\\n    at async Module.POST (blob:https://kzmgirinpzugl3p9aa8d.lite.vusercontent.net/3cc2d0ba-9ce5-4224-b806-7d24d6ff3c61:114:29)\\n    at async Y (https://kzmgirinpzugl3p9aa8d.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmgirinpzugl3p9aa8d.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmgirinpzugl3p9aa8d.lite.vusercontent.net/dd5e77bc-3a6c-4f2a-b888-28962e359e3a:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750841225334", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "Mohammed"	\N	\N	2025-06-25 08:47:08.861822+00	2025-06-25 08:47:08.861822+00	\N
1860	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "invalid input syntax for type uuid: \\"Mohammed\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750841964534", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Mohammed Salim", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "Mohammed"	\N	\N	2025-06-25 08:59:27.51847+00	2025-06-25 08:59:27.51847+00	\N
1861	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "invalid input syntax for type uuid: \\"Mohammed\\"", "stack": "NeonDbError: invalid input syntax for type uuid: \\"Mohammed\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a035c303-8bfd-44fe-9918-ea6b3c1bf4c1:47:28)\\n    at async Module.POST (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/b49e0e3f-71c1-404f-9c4b-8a97cfcf933b:116:29)\\n    at async Y (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a20da734-dd90-497d-a3ca-aca4f843a69e:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750841964534", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Mohammed Salim", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	invalid input syntax for type uuid: "Mohammed"	\N	\N	2025-06-25 08:59:28.219728+00	2025-06-25 08:59:28.219728+00	\N
1862	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Mohammed Salim	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Mohammed Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 09:03:39.541173+00	2025-06-25 09:03:39.541173+00	\N
1863	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750842218154", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Mohammed Salim", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:03:40.983252+00	2025-06-25 09:03:40.983252+00	\N
1864	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "stack": "NeonDbError: new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a035c303-8bfd-44fe-9918-ea6b3c1bf4c1:47:28)\\n    at async Module.POST (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/b49e0e3f-71c1-404f-9c4b-8a97cfcf933b:116:29)\\n    at async Y (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a20da734-dd90-497d-a3ca-aca4f843a69e:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750842218154", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Mohammed Salim", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:03:41.714745+00	2025-06-25 09:03:41.714745+00	\N
1865	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Mohammed Salim	{"fee": 0, "type": "cash_in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Mohammed Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 09:07:20.94051+00	2025-06-25 09:07:20.94051+00	\N
1866	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750842439560", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Mohammed Salim", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:07:22.373131+00	2025-06-25 09:07:22.373131+00	\N
1885	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "could not determine data type of parameter $4", "transactionData": {"fee": 0, "type": "cash-in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-CI-1750849336865-804", "phone_number": "0554899202", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	could not determine data type of parameter $4	\N	\N	2025-06-25 11:02:26.965703+00	2025-06-25 11:02:26.965703+00	\N
1902	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Salim	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "Vodafone", "phone_number": "0554899202", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 16:58:27.434335+00	2025-06-25 16:58:27.434335+00	\N
1867	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "stack": "NeonDbError: new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a035c303-8bfd-44fe-9918-ea6b3c1bf4c1:47:28)\\n    at async Module.POST (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/b49e0e3f-71c1-404f-9c4b-8a97cfcf933b:116:29)\\n    at async Y (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a20da734-dd90-497d-a3ca-aca4f843a69e:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 1000, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750842439560", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Mohammed Salim", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:07:23.09769+00	2025-06-25 09:07:23.09769+00	\N
1868	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_card_issuance	ezwich_card	a5754256-6be8-46f9-9db4-b9ed53b5b99f	E-Zwich card 97324758 issued to Mohammed Salim Abdul-Majeed	{"reference": "N/A", "fee_amount": 15, "card_number": "97324758", "has_id_photo": false, "partner_bank": "absa", "customer_name": "Mohammed Salim Abdul-Majeed", "payment_method": "cash", "has_customer_photo": false}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 09:07:40.267288+00	2025-06-25 09:07:40.267288+00	\N
1869	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 200, "provider": "Z-Pay", "phone_number": "0248142134", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 09:13:33.429447+00	2025-06-25 09:13:33.429447+00	\N
1870	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750842812087", "phone_number": "0248142134", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:13:34.865435+00	2025-06-25 09:13:34.865435+00	\N
1871	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "stack": "NeonDbError: new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a035c303-8bfd-44fe-9918-ea6b3c1bf4c1:47:28)\\n    at async Module.POST (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/b49e0e3f-71c1-404f-9c4b-8a97cfcf933b:116:29)\\n    at async Y (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmlilj32pymvi88a8uy.lite.vusercontent.net/a20da734-dd90-497d-a3ca-aca4f843a69e:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 200, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750842812087", "branchName": "Hill Top Branch", "phone_number": "0248142134", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:13:35.793979+00	2025-06-25 09:13:35.793979+00	\N
1872	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Jane Smith	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "Z-Pay", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 09:53:38.674819+00	2025-06-25 09:53:38.674819+00	\N
1873	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750845217277", "phone_number": "0554899202", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:53:40.352364+00	2025-06-25 09:53:40.352364+00	\N
1900	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	momo_transaction_created	momo_transaction	49dba19e-10e4-4100-b976-da3af74efdcb	Created MoMo cash-in transaction for Jane Smith	{"fee": 0, "amount": 200, "provider": "MTN", "phone_number": "0549514616", "transactionId": "49dba19e-10e4-4100-b976-da3af74efdcb", "cashBalanceChange": 200, "momoBalanceChange": -200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 16:29:53.709257+00	2025-06-25 16:29:53.709257+00	\N
1901	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	momo_transaction_success	momo_transaction	49dba19e-10e4-4100-b976-da3af74efdcb	Successfully processed MoMo cash-in transaction	{"fee": 0, "amount": 200, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith", "transactionId": "49dba19e-10e4-4100-b976-da3af74efdcb"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 16:29:54.753325+00	2025-06-25 16:29:54.753325+00	\N
1919	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_gl_posted	power_transaction	8af283eb-812e-463d-bb62-7c2ebc75765a	power_sale_gl_posted action on power_transaction	{"amount": 100, "provider": "vra", "meter_number": "6546545", "customer_name": "Unknown Customer", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:35:45.92428+00	2025-06-27 07:35:45.92428+00	\N
1874	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "stack": "NeonDbError: new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/0a2c8b33-f005-405d-9184-c81ade11592b:47:28)\\n    at async Module.POST (blob:https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/49244702-9d61-483d-85be-876990a8e807:116:29)\\n    at async Y (https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/91f8abe3-fea0-4592-952f-e06bf9a82192:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750845217277", "branchName": "Hill Top Branch", "phone_number": "0554899202", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:53:41.077664+00	2025-06-25 09:53:41.077664+00	\N
1875	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash_in transaction for Salim	{"fee": 0, "type": "cash_in", "amount": 100, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 09:58:58.344819+00	2025-06-25 09:58:58.344819+00	\N
1876	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failed	momo_transaction	\N	Failed to create MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "transactionData": {"fee": 0, "type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750845536980", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Salim", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:58:59.770277+00	2025-06-25 09:58:59.770277+00	\N
1877	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"", "stack": "NeonDbError: new row for relation \\"momo_transactions\\" violates check constraint \\"momo_transactions_type_check\\"\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/0a2c8b33-f005-405d-9184-c81ade11592b:47:28)\\n    at async Module.POST (blob:https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/49244702-9d61-483d-85be-876990a8e807:116:29)\\n    at async Y (https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmj8hm38gu3dtmw19v6.lite.vusercontent.net/91f8abe3-fea0-4592-952f-e06bf9a82192:201:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"type": "cash_in", "amount": 100, "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "MTN", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1750845536980", "branchName": "Hill Top Branch", "phone_number": "0549514616", "processed_by": "Mohammed", "customer_name": "Salim", "float_account_id": "0c6320ae-fb6c-408e-8cfa-934d6d253087"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	new row for relation "momo_transactions" violates check constraint "momo_transactions_type_check"	\N	\N	2025-06-25 09:59:00.514033+00	2025-06-25 09:59:00.514033+00	\N
1878	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Abdul Kadir	{"fee": 10, "type": "cash-in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Abdul Kadir"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 10:22:23.103617+00	2025-06-25 10:22:23.103617+00	\N
1879	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_created	momo_transaction	9109647e-ceeb-48b9-aac3-36b7b3f50769	Created MoMo cash-in transaction for Abdul Kadir	{"fee": 10, "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "transactionId": "9109647e-ceeb-48b9-aac3-36b7b3f50769"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 10:22:25.010293+00	2025-06-25 10:22:25.010293+00	\N
1880	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_success	momo_transaction	9109647e-ceeb-48b9-aac3-36b7b3f50769	Successfully processed MoMo cash-in transaction	{"fee": 10, "amount": 1000, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Abdul Kadir", "transactionId": "9109647e-ceeb-48b9-aac3-36b7b3f50769"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 10:22:25.731198+00	2025-06-25 10:22:25.731198+00	\N
1881	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-out transaction for Jane Smith	{"fee": 2, "type": "cash-out", "amount": 100, "provider": "MTN", "phone_number": "0547910720", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 10:26:19.671679+00	2025-06-25 10:26:19.671679+00	\N
1882	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_created	momo_transaction	1cab2a8a-8b75-47ef-8ebb-4d311c52f21d	Created MoMo cash-out transaction for Jane Smith	{"fee": 2, "amount": 100, "provider": "MTN", "phone_number": "0547910720", "transactionId": "1cab2a8a-8b75-47ef-8ebb-4d311c52f21d"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 10:26:21.488664+00	2025-06-25 10:26:21.488664+00	\N
1883	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_success	momo_transaction	1cab2a8a-8b75-47ef-8ebb-4d311c52f21d	Successfully processed MoMo cash-out transaction	{"fee": 2, "amount": 100, "provider": "MTN", "phone_number": "0547910720", "customer_name": "Jane Smith", "transactionId": "1cab2a8a-8b75-47ef-8ebb-4d311c52f21d"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 10:26:22.236574+00	2025-06-25 10:26:22.236574+00	\N
1884	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 0, "type": "cash-in", "amount": 1000, "provider": "Z-Pay", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 11:02:24.113353+00	2025-06-25 11:02:24.113353+00	\N
1886	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_failure	momo_transaction	\N	Failed to process MoMo transaction	{"error": "could not determine data type of parameter $4", "stack": "NeonDbError: could not determine data type of parameter $4\\n    at ur.execute (https://esm.v0.dev/@neondatabase/serverless@1.0.1/es2022/serverless.mjs:22:4104)\\n    at async EnhancedMoMoService.createEnhancedTransaction (blob:https://kzmiyx08tz5uq1fmn3nd.lite.vusercontent.net/b8d86dd1-21d8-435a-9d08-136faaf4436e:111:13)\\n    at async Module.POST (blob:https://kzmiyx08tz5uq1fmn3nd.lite.vusercontent.net/52320b1a-897f-468a-9e38-6e8deef6fa8c:123:29)\\n    at async Y (https://kzmiyx08tz5uq1fmn3nd.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:6031)\\n    at async globalThis.fetch (https://kzmiyx08tz5uq1fmn3nd.lite.vusercontent.net/_next/static/chunks/3162-da867eb6d202f7e7.js?dpl=dpl_5KCzKpKC4DtoJcZbb55rLBoFdpvW:1:7065)\\n    at async onSubmit (blob:https://kzmiyx08tz5uq1fmn3nd.lite.vusercontent.net/d096851f-8672-4f69-89f2-77768bebad5b:280:30)\\n    at async https://esm.v0.dev/react-hook-form@7.58.1/es2022/react-hook-form.mjs:2:21820", "requestData": {"fee": 0, "type": "cash-in", "amount": 1000, "status": "completed", "user_id": "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", "provider": "Z-Pay", "username": "Mohammed", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-CI-1750849336865-804", "branchName": "Hill Top Branch", "phone_number": "0554899202", "processed_by": "Mohammed", "customer_name": "Jane Smith", "float_account_id": "49f9aec4-8c95-42a9-b9d2-7a2688d0096c"}}	\N	\N	critical	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	failure	could not determine data type of parameter $4	\N	\N	2025-06-25 11:02:27.897786+00	2025-06-25 11:02:27.897786+00	\N
1887	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 3, "type": "cash-in", "amount": 1000, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 11:15:45.079648+00	2025-06-25 11:15:45.079648+00	\N
1888	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_created	momo_transaction	5b73e5bd-9d8a-4664-83fb-477fb6c0e68c	Created MoMo cash-in transaction for Jane Smith	{"fee": 3, "amount": 1000, "provider": "MTN", "phone_number": "0554899202", "transactionId": "5b73e5bd-9d8a-4664-83fb-477fb6c0e68c", "cashBalanceChange": 1000, "momoBalanceChange": -1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 11:15:48.638727+00	2025-06-25 11:15:48.638727+00	\N
1889	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	momo_transaction_success	momo_transaction	5b73e5bd-9d8a-4664-83fb-477fb6c0e68c	Successfully processed MoMo cash-in transaction	{"fee": 3, "amount": 1000, "provider": "MTN", "phone_number": "0554899202", "customer_name": "Jane Smith", "transactionId": "5b73e5bd-9d8a-4664-83fb-477fb6c0e68c"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 11:15:49.418783+00	2025-06-25 11:15:49.418783+00	\N
1890	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	abt-05a1b4eb	agency_banking_withdrawal transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "2464402761018", "floatAffected": 1000, "glTransactionId": "4174779a-685a-402f-9718-e2ee164352be", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 11:23:09.675174+00	2025-06-25 11:23:09.675174+00	\N
1891	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1750850666007_501	jumia_package_received action on jumia_transaction	{"tracking_id": "29837945", "customer_name": "Mohammed Salim", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 11:24:31.340319+00	2025-06-25 11:24:31.340319+00	\N
1892	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1750850666007_501	jumia_package_received action on jumia_transaction	{"tracking_id": "29837945", "customer_name": "Mohammed Salim", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 11:24:35.452283+00	2025-06-25 11:24:35.452283+00	\N
1893	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1750850666007_501	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "29837945", "customer_name": "Mohammed Salim", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 11:24:36.503325+00	2025-06-25 11:24:36.503325+00	\N
1894	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1750850878147_216	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "9832475845", "total_debits": 200, "customer_name": "Abu Sadik", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 11:28:10.492527+00	2025-06-25 11:28:10.492527+00	\N
1895	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1750850878147_216	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "9832475845", "total_debits": 200, "customer_name": "Abu Sadik", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 11:28:18.033907+00	2025-06-25 11:28:18.033907+00	\N
1896	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1750850878147_216	Jumia pod_collection transaction completed successfully	{"amount": 200, "gl_posted": true, "tracking_id": "9832475845", "customer_name": "Abu Sadik", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 11:28:19.131227+00	2025-06-25 11:28:19.131227+00	\N
1897	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	abt-15068a46	agency_banking_deposit transaction create: GHS 200	{"fee": 0, "action": "create", "amount": 200, "reference": "", "partnerBank": "GCB", "customerName": "Jane Smith", "accountNumber": "72982092782233", "floatAffected": -200, "glTransactionId": "0cfd25b1-59e8-40a7-a63b-b8e19684b1dd", "transactionType": "agency_banking_deposit", "cashTillAffected": 200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 11:46:20.669046+00	2025-06-25 11:46:20.669046+00	\N
1898	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	abt-a53762c2	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "", "partnerBank": "GCB", "customerName": "Jane Smith", "accountNumber": "72982092782233", "floatAffected": -1000, "glTransactionId": "992103e6-97a4-4b64-8054-3da70919b90e", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 15:43:13.809456+00	2025-06-25 15:43:13.809456+00	\N
1899	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	momo_transaction_attempt	momo_transaction	\N	Attempting MoMo cash-in transaction for Jane Smith	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 16:29:48.738655+00	2025-06-25 16:29:48.738655+00	\N
1976	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751146202381_159	jumia_package_received action on jumia_transaction	{"tracking_id": "43252345", "customer_name": "jkashkdf", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:30:12.700622+00	2025-06-28 21:30:12.700622+00	\N
1903	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	momo_transaction_created	momo_transaction	71872a8b-cea1-442f-bea3-f05380341cb6	Created MoMo cash-in transaction for Salim	{"fee": 0, "amount": 200, "provider": "Vodafone", "phone_number": "0554899202", "transactionId": "71872a8b-cea1-442f-bea3-f05380341cb6", "cashBalanceChange": 200, "momoBalanceChange": -200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 16:58:30.717038+00	2025-06-25 16:58:30.717038+00	\N
1904	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	momo_transaction_success	momo_transaction	71872a8b-cea1-442f-bea3-f05380341cb6	Successfully processed MoMo cash-in transaction	{"fee": 0, "amount": 200, "provider": "Vodafone", "phone_number": "0554899202", "customer_name": "Salim", "transactionId": "71872a8b-cea1-442f-bea3-f05380341cb6"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-25 16:58:31.40803+00	2025-06-25 16:58:31.40803+00	\N
1905	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - VRA - 6546545 - GHS 200	{"amount": 200, "provider": "vra", "reference": "PWR-222044e8-3b14-4197-a81d-9faedcfb379e", "meter_number": "6546545", "error_message": "new row for relation \\"power_transactions\\" violates check constraint \\"power_transactions_provider_check\\"", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-25 23:21:15.769967+00	2025-06-25 23:21:15.769967+00	\N
1906	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	abt-5f0fa354	agency_banking_deposit transaction create: GHS 1000	{"fee": 5, "action": "create", "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "72982092782233", "floatAffected": -1000, "glTransactionId": "a117c7c6-0a00-48e2-89bf-8a0727f99874", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-26 06:56:27.438993+00	2025-06-26 06:56:27.438993+00	\N
1907	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - VRA - 8028304 - GHS 100	{"amount": 100, "provider": "vra", "reference": "PWR-81383ba7-5f86-4c64-a129-deead78055bc", "meter_number": "8028304", "error_message": "new row for relation \\"power_transactions\\" violates check constraint \\"power_transactions_provider_check\\"", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 06:58:08.161109+00	2025-06-26 06:58:08.161109+00	\N
1908	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1750921173177_113	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "795235794", "total_debits": 200, "customer_name": "Mubaraka", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 06:59:43.660672+00	2025-06-26 06:59:43.660672+00	\N
1909	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1750921173177_113	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "795235794", "total_debits": 200, "customer_name": "Mubaraka", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 06:59:47.669716+00	2025-06-26 06:59:47.669716+00	\N
1910	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1750921173177_113	Jumia pod_collection transaction completed successfully	{"amount": 200, "gl_posted": true, "tracking_id": "795235794", "customer_name": "Mubaraka", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 06:59:48.279412+00	2025-06-26 06:59:48.279412+00	\N
1911	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	abt-45259eb3	agency_banking_deposit transaction create: GHS 200	{"fee": 5, "action": "create", "amount": 200, "reference": "", "partnerBank": "GCB", "customerName": "Jane Smith", "accountNumber": "2464402761018", "floatAffected": -200, "glTransactionId": "ccc29172-c569-490a-9c7b-4d2acbafae60", "transactionType": "agency_banking_deposit", "cashTillAffected": 200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-26 07:43:17.743577+00	2025-06-26 07:43:17.743577+00	\N
1912	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - VRA - 98023745 - GHS 1000	{"amount": 1000, "provider": "vra", "reference": "PWR-e4ee4cf6-c32e-40bc-ace4-ea5e78c01df0", "meter_number": "98023745", "error_message": "new row for relation \\"power_transactions\\" violates check constraint \\"power_transactions_provider_check\\"", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 07:48:20.696772+00	2025-06-26 07:48:20.696772+00	\N
1913	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - ECG - 3252345 - GHS 2222	{"amount": 2222, "provider": "ecg", "reference": "PWR-9e3597f2-fb9c-40b3-9720-d067ecd1089e", "meter_number": "3252345", "error_message": "Insufficient power float balance for ECG. Available: 120, Required: 2222", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 10:26:00.321867+00	2025-06-26 10:26:00.321867+00	\N
1914	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - VRA - 6546545 - GHS 200	{"amount": 200, "provider": "vra", "reference": "PWR-a87838a7-14ef-458f-8312-ed901abeb07f", "meter_number": "6546545", "error_message": "new row for relation \\"power_transactions\\" violates check constraint \\"power_transactions_provider_check\\"", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 11:12:04.061738+00	2025-06-26 11:12:04.061738+00	\N
1915	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_gl_posted	power_transaction	b750fee4-267e-4ccd-876f-e92873fda37a	power_sale_gl_posted action on power_transaction	{"amount": 100, "provider": "ecg", "meter_number": "6546545", "customer_name": "Unknown Customer", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 15:19:04.736895+00	2025-06-26 15:19:04.736895+00	\N
1916	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_completed	power_transaction	b750fee4-267e-4ccd-876f-e92873fda37a	Power sale completed - ECG - 6546545 - GHS 100	{"amount": 100, "provider": "ecg", "reference": "PWR-b25fe243-9a2f-472f-9e26-e0d8daebc13e", "meter_number": "6546545", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "243af67a-1cb7-4e76-a5be-b575a2d41a49"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-26 15:19:06.707428+00	2025-06-26 15:19:06.707428+00	\N
1917	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	abt-608e7da1	agency_banking_deposit transaction create: GHS 100	{"fee": 5, "action": "create", "amount": 100, "reference": "", "partnerBank": "Fidelity Bank", "customerName": "Salim", "accountNumber": "298628729202", "floatAffected": -100, "glTransactionId": "67a1b187-bf87-479e-a7e6-18e3f90309dc", "transactionType": "agency_banking_deposit", "cashTillAffected": 100}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-27 07:29:38.055133+00	2025-06-27 07:29:38.055133+00	\N
1918	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - VRA - 6546545 - GHS 100	{"amount": 100, "provider": "vra", "reference": "PWR-08101e83-142c-475f-9895-9486219ad35e", "meter_number": "6546545", "error_message": "new row for relation \\"power_transactions\\" violates check constraint \\"power_transactions_provider_check\\"", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:34:41.220657+00	2025-06-27 07:34:41.220657+00	\N
1920	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_completed	power_transaction	8af283eb-812e-463d-bb62-7c2ebc75765a	Power sale completed - VRA - 6546545 - GHS 100	{"amount": 100, "provider": "vra", "reference": "PWR-e34d4424-8b67-4bda-b8d8-37b8f5645b77", "meter_number": "6546545", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "2fe947a8-c85f-42b8-9aff-c85bc4439484"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:35:47.080093+00	2025-06-27 07:35:47.080093+00	\N
1921	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751009870238_273	jumia_package_received action on jumia_transaction	{"tracking_id": "72374895", "customer_name": "Jane Smith", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:37:54.298755+00	2025-06-27 07:37:54.298755+00	\N
1922	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751009870238_273	jumia_package_received action on jumia_transaction	{"tracking_id": "72374895", "customer_name": "Jane Smith", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:37:58.429241+00	2025-06-27 07:37:58.429241+00	\N
1923	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751009870238_273	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "72374895", "customer_name": "Jane Smith", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:37:59.245833+00	2025-06-27 07:37:59.245833+00	\N
1924	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_settlement_processed	jumia_transaction	SET_1751009950766_734	jumia_settlement_processed action on jumia_transaction	{"amount": 1521, "gl_posted": true, "total_debits": 1521, "total_credits": 1521, "payment_method": "bank", "gl_entries_count": 2, "transaction_type": "settlement", "settlement_reference": "9032434"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:39:21.503133+00	2025-06-27 07:39:21.503133+00	\N
1925	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_settlement_processed	jumia_transaction	SET_1751009950766_734	jumia_settlement_processed action on jumia_transaction	{"amount": 1521, "gl_posted": true, "total_debits": 1521, "total_credits": 1521, "payment_method": "cash", "gl_entries_count": 2, "transaction_type": "settlement", "settlement_reference": "9032434"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:39:29.14359+00	2025-06-27 07:39:29.14359+00	\N
1926	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_settlement_completed	jumia_transaction	SET_1751009950766_734	Jumia settlement transaction completed successfully	{"amount": 1521, "gl_posted": true, "transaction_type": "settlement", "settlement_reference": "9032434"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 07:39:29.763188+00	2025-06-27 07:39:29.763188+00	\N
1927	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_interbank	abt-35626405	agency_banking_interbank transaction create: GHS 100	{"fee": 15, "action": "create", "amount": 100, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "72982092782233", "floatAffected": -100, "glTransactionId": "4204a3fb-e9bf-4a00-b2d2-099db779ee04", "transactionType": "agency_banking_interbank", "cashTillAffected": 115}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-27 09:06:42.234985+00	2025-06-27 09:06:42.234985+00	\N
1928	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - ECG - 6546545 - GHS 200	{"amount": 200, "provider": "ecg", "reference": "PWR-27cfb097-c568-4d72-b5f6-d84441cb9480", "meter_number": "6546545", "error_message": "Insufficient power float balance for ECG. Available: 20, Required: 200", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 10:35:30.111058+00	2025-06-27 10:35:30.111058+00	\N
1929	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_gl_posted	power_transaction	58b3c9bd-3561-4bf5-8079-78725ff0ddfb	power_sale_gl_posted action on power_transaction	{"amount": 200, "provider": "vra", "meter_number": "6546545", "customer_name": "Unknown Customer", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 10:35:55.876346+00	2025-06-27 10:35:55.876346+00	\N
1930	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_completed	power_transaction	58b3c9bd-3561-4bf5-8079-78725ff0ddfb	Power sale completed - VRA - 6546545 - GHS 200	{"amount": 200, "provider": "vra", "reference": "PWR-2b3987b5-ce0e-4c76-b931-fb09f9def7ab", "meter_number": "6546545", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "2fe947a8-c85f-42b8-9aff-c85bc4439484"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 10:35:56.930539+00	2025-06-27 10:35:56.930539+00	\N
1931	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	30c6f6e0-1ee2-44ec-81d0-f16069f15804	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 99.99, "provider": "Z-Pay", "phone_number": "0549514616", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 10:50:50.847119+00	2025-06-27 10:50:50.847119+00	\N
1932	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - ECG - 6546545 - GHS 100	{"amount": 100, "provider": "ecg", "reference": "PWR-07107c7e-26ff-478e-beee-ba88d4e13cf4", "meter_number": "6546545", "error_message": "Insufficient power float balance for ECG. Available: 20, Required: 100", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 11:34:12.756513+00	2025-06-27 11:34:12.756513+00	\N
1933	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_gl_posted	power_transaction	3980b683-a3cc-46a7-bb43-f1419deeaf50	power_sale_gl_posted action on power_transaction	{"amount": 100, "provider": "vra", "meter_number": "6546545", "customer_name": "Unknown Customer", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 11:34:36.89857+00	2025-06-27 11:34:36.89857+00	\N
1934	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_completed	power_transaction	3980b683-a3cc-46a7-bb43-f1419deeaf50	Power sale completed - VRA - 6546545 - GHS 100	{"amount": 100, "provider": "vra", "reference": "PWR-3119fb9f-f124-4dd3-a16d-1eb9df32d608", "meter_number": "6546545", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "2fe947a8-c85f-42b8-9aff-c85bc4439484"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 11:34:37.923897+00	2025-06-27 11:34:37.923897+00	\N
1935	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	6008ceec-bbc7-4484-a0a5-a92351406c60	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0248142134", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 12:07:41.63797+00	2025-06-27 12:07:41.63797+00	\N
1936	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	05139084-f67f-4f70-bbc4-01278889cd9a	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 5, "type": "withdrawal", "amount": 199.99, "card_number": "8329759348", "customer_name": "Jane Smith", "settlement_account": "GCB"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 12:11:14.436026+00	2025-06-27 12:11:14.436026+00	\N
1937	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	240bf7ca-7fbc-40e6-96f7-1c1b7f456604	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "MTN", "phone_number": "0248142134", "customer_name": "Abdul Kadir"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 15:27:39.883497+00	2025-06-27 15:27:39.883497+00	\N
1938	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	abt-5997afe3	agency_banking_deposit transaction create: GHS 100	{"fee": 5, "action": "create", "amount": 100, "reference": "", "partnerBank": "Cal Bank", "customerName": "Salim", "accountNumber": "298628729202", "floatAffected": -100, "glTransactionId": "5022347e-11cd-444e-88da-c6335ac73558", "transactionType": "agency_banking_deposit", "cashTillAffected": 100}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-27 15:30:58.803374+00	2025-06-27 15:30:58.803374+00	\N
1939	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	b9c71ea5-6ca2-4138-8ddd-35b61d4bb556	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 9, "type": "withdrawal", "amount": 900, "card_number": "00007", "customer_name": "Jane Smith", "settlement_account": "GCB"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 15:31:29.90502+00	2025-06-27 15:31:29.90502+00	\N
1940	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	08361c58-a33e-4af1-9be8-3f033519534e	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 1000, "provider": "Vodafone", "phone_number": "0549514616", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 15:32:56.976503+00	2025-06-27 15:32:56.976503+00	\N
1941	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	50ea7fb2-7f30-4990-8cd3-d95504082db1	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 422, "provider": "Vodafone", "phone_number": "0554899202", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 15:34:26.936274+00	2025-06-27 15:34:26.936274+00	\N
1942	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-out	momo_transaction	fe8c29f2-e707-402e-870d-6f7f005deba0	momo_cash-out action on momo_transaction	{"fee": 2, "type": "cash-out", "amount": 500, "provider": "Vodafone", "phone_number": "0547910720", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 15:35:07.341376+00	2025-06-27 15:35:07.341376+00	\N
1943	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-out	momo_transaction	dd9db583-9978-4dce-9519-33075f9c3350	momo_cash-out action on momo_transaction	{"fee": 1, "type": "cash-out", "amount": 400, "provider": "Vodafone", "phone_number": "0549514616", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 16:01:58.276446+00	2025-06-27 16:01:58.276446+00	\N
1944	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-out	momo_transaction	3a123baa-8df7-42b3-82c6-5c7b43cfd444	momo_cash-out action on momo_transaction	{"fee": 5, "type": "cash-out", "amount": 600, "provider": "Vodafone", "phone_number": "0547910720", "customer_name": "Abdul Aziz"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 16:04:13.320846+00	2025-06-27 16:04:13.320846+00	\N
1945	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-out	momo_transaction	cdad6611-be88-4bcf-b2b8-43317405ced0	momo_cash-out action on momo_transaction	{"fee": 2, "type": "cash-out", "amount": 200, "provider": "Vodafone", "phone_number": "0240388114", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 16:26:02.973969+00	2025-06-27 16:26:02.973969+00	\N
1946	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	f6e32fc9-26ef-42b5-91c5-1539a4321203	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 212, "provider": "Vodafone", "phone_number": "0547910720", "customer_name": "Abdul Aziz"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 16:42:50.456402+00	2025-06-27 16:42:50.456402+00	\N
1947	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	fe6abbd2-8147-4123-a429-ea9e0093f564	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 100, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 16:53:53.307521+00	2025-06-27 16:53:53.307521+00	\N
1948	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	eaeba21a-ca46-4bb4-8f65-64bf80271116	momo_cash-in action on momo_transaction	{"fee": 10, "type": "cash-in", "amount": 100, "provider": "Vodafone", "phone_number": "0554899202", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 19:11:51.789443+00	2025-06-27 19:11:51.789443+00	\N
1949	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-out	momo_transaction	6de255f0-22ae-4913-9c47-7f7a7f35db04	momo_cash-out action on momo_transaction	{"fee": 5, "type": "cash-out", "amount": 1000, "provider": "Vodafone", "phone_number": "0248142134", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 19:20:59.413012+00	2025-06-27 19:20:59.413012+00	\N
1950	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	a0dcc9e2-d408-464d-b79d-410bcca973a1	momo_cash-in action on momo_transaction	{"fee": 4, "type": "cash-in", "amount": 400, "provider": "Vodafone", "phone_number": "0245123654", "customer_name": "dsfasdf"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-27 23:07:09.942976+00	2025-06-27 23:07:09.942976+00	\N
1951	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	4d493752-58c8-4cac-886c-63b54ff0fadd	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 00:18:19.34962+00	2025-06-28 00:18:19.34962+00	\N
1952	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	abt-69d5534f	agency_banking_withdrawal transaction create: GHS 200	{"fee": 10, "action": "create", "amount": 200, "reference": "", "partnerBank": "GCB", "customerName": "Ibrahim Hardi", "accountNumber": "72982092782233", "floatAffected": 200, "glTransactionId": "4496586a-4980-4036-9645-a65394ed35d7", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-28 00:19:11.287562+00	2025-06-28 00:19:11.287562+00	\N
1953	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	5a469377-7940-42cb-b6a5-7c98b44867fe	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 1000, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 09:30:02.710436+00	2025-06-28 09:30:02.710436+00	\N
1954	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	a7638c08-dfac-45a9-afde-78e5099bdebb	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 1000, "provider": "Vodafone", "phone_number": "0549514616", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 09:34:03.429528+00	2025-06-28 09:34:03.429528+00	\N
1955	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-out	momo_transaction	81c1fbc6-ead4-4ef6-96a8-97c33ff6065f	momo_cash-out action on momo_transaction	{"fee": 2, "type": "cash-out", "amount": 200, "provider": "Z-Pay", "phone_number": "0547910720", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 09:53:24.617567+00	2025-06-28 09:53:24.617567+00	\N
1956	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	e63f2d32-c0ec-463c-972b-4cdea44f7ea1	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 200, "provider": "Z-Pay", "phone_number": "5027599206", "customer_name": "Jane Smith"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 11:08:23.96125+00	2025-06-28 11:08:23.96125+00	\N
1957	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	momo_cash-in	momo_transaction	42d7915d-1f33-4679-a42c-c75db9f65ca9	momo_cash-in action on momo_transaction	{"fee": 0, "type": "cash-in", "amount": 100, "provider": "Vodafone", "phone_number": "5027599206", "customer_name": "Salim"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 11:08:51.495889+00	2025-06-28 11:08:51.495889+00	\N
1959	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	abt-359030ae	agency_banking_withdrawal transaction create: GHS 3999.99	{"fee": 10, "action": "create", "amount": 3999.99, "reference": "AGENCY-1751113499863", "partnerBank": "Cal Bank", "customerName": "Abdul Kadir", "accountNumber": "62034028472432", "floatAffected": 3999.99, "glTransactionId": null, "transactionType": "agency_banking_withdrawal", "cashTillAffected": -3999.99}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-28 12:25:06.788474+00	2025-06-28 12:25:06.788474+00	\N
1960	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	eccbe748-c996-4982-88e5-1d993cc852fd	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 7, "type": "withdrawal", "amount": 700, "card_number": "00006", "customer_name": "Jane Smith", "settlement_account": "GCB"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:26:09.018851+00	2025-06-28 12:26:09.018851+00	\N
1961	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751113717952_528	jumia_pod_collection_processed action on jumia_transaction	{"amount": 2000, "gl_posted": true, "tracking_id": "#8974-0234", "total_debits": 2000, "customer_name": "Jane Smith", "total_credits": 2000, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:28:55.041864+00	2025-06-28 12:28:55.041864+00	\N
1962	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751113717952_528	jumia_pod_collection_processed action on jumia_transaction	{"amount": 2000, "gl_posted": true, "tracking_id": "#8974-0234", "total_debits": 2000, "customer_name": "Jane Smith", "total_credits": 2000, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:29:05.161645+00	2025-06-28 12:29:05.161645+00	\N
1963	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751113717952_528	Jumia pod_collection transaction completed successfully	{"amount": 2000, "gl_posted": true, "tracking_id": "#8974-0234", "customer_name": "Jane Smith", "transaction_type": "pod_collection"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:29:06.114713+00	2025-06-28 12:29:06.114713+00	\N
1964	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	abt-0198a3ba	agency_banking_withdrawal transaction create: GHS 4000	{"fee": 10, "action": "create", "amount": 4000, "reference": "AGENCY-1751114527995", "partnerBank": "Fidelity Bank", "customerName": "MOHAMMED SALIM ABDUL-MAJEED", "accountNumber": "72982092782233", "floatAffected": 4000, "glTransactionId": "f28e56d6-0f97-49cf-959a-1b2db2837441", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -4000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-28 12:42:21.182733+00	2025-06-28 12:42:21.182733+00	\N
1965	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_failed	power_transaction	\N	Power sale failed - ECG - 6546545 - GHS 200	{"amount": 200, "provider": "ecg", "reference": "PWR-c78945d5-1501-4b95-bdf7-647677e0fd2b", "meter_number": "6546545", "error_message": "Insufficient power float balance for ECG. Available: 20, Required: 200", "transaction_type": "sale"}	\N	\N	high	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:42:52.558221+00	2025-06-28 12:42:52.558221+00	\N
1966	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_gl_posted	power_transaction	95962dc1-1c3d-4086-809a-006c289a8746	power_sale_gl_posted action on power_transaction	{"amount": 200, "provider": "vra", "meter_number": "6546545", "customer_name": "Unknown Customer", "gl_entries_count": 2, "transaction_type": "sale"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:43:19.457556+00	2025-06-28 12:43:19.457556+00	\N
1967	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	power_sale_completed	power_transaction	95962dc1-1c3d-4086-809a-006c289a8746	Power sale completed - VRA - 6546545 - GHS 200	{"amount": 200, "provider": "vra", "reference": "PWR-a90ff8bf-a657-4d4a-b68a-e3a61c4aaf16", "meter_number": "6546545", "transaction_type": "sale", "cash_till_account": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "power_float_account": "2fe947a8-c85f-42b8-9aff-c85bc4439484"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 12:43:20.921917+00	2025-06-28 12:43:20.921917+00	\N
1968	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	abt-83488e8e	agency_banking_withdrawal transaction create: GHS 200	{"fee": 0, "action": "create", "amount": 200, "reference": "AGENCY-1751143690132", "partnerBank": "Ecobank", "customerName": "Abdul", "accountNumber": "39873285745245", "floatAffected": 200, "glTransactionId": "d4860152-50b0-4b9f-ba78-26a2f8bcd253", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -200}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-28 20:48:11.048387+00	2025-06-28 20:48:11.048387+00	\N
1969	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751144408816_850	jumia_package_received action on jumia_transaction	{"tracking_id": "2978943785", "customer_name": "Razak", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:00:15.146855+00	2025-06-28 21:00:15.146855+00	\N
1970	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751144408816_850	jumia_package_received action on jumia_transaction	{"tracking_id": "2978943785", "customer_name": "Razak", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:00:20.87406+00	2025-06-28 21:00:20.87406+00	\N
1971	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751144408816_850	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "2978943785", "customer_name": "Razak", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:00:22.429776+00	2025-06-28 21:00:22.429776+00	\N
1972	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751144483590_756	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "9298753453", "total_debits": 200, "customer_name": "Moammeds ksds", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:01:39.510666+00	2025-06-28 21:01:39.510666+00	\N
1973	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751144483590_756	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "9298753453", "total_debits": 200, "customer_name": "Moammeds ksds", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:01:51.583041+00	2025-06-28 21:01:51.583041+00	\N
1974	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751144483590_756	Jumia pod_collection transaction completed successfully	{"amount": 200, "gl_posted": true, "tracking_id": "9298753453", "customer_name": "Moammeds ksds", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:01:53.257843+00	2025-06-28 21:01:53.257843+00	\N
1975	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	abt-eb8cf217	agency_banking_withdrawal transaction create: GHS 2333	{"fee": 23, "action": "create", "amount": 2333, "reference": "AGENCY-1751145957010", "partnerBank": "Fidelity", "customerName": "ahhsdkjfh", "accountNumber": "8628756287465", "floatAffected": 2333, "glTransactionId": "171feda6-6fac-4f85-8a7f-c6c59a024d88", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -2333}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-28 21:25:57.801675+00	2025-06-28 21:25:57.801675+00	\N
1977	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751146202381_159	jumia_package_received action on jumia_transaction	{"tracking_id": "43252345", "customer_name": "jkashkdf", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:30:18.877024+00	2025-06-28 21:30:18.877024+00	\N
1978	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751146202381_159	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "43252345", "customer_name": "jkashkdf", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-28 21:30:20.381506+00	2025-06-28 21:30:20.381506+00	\N
1979	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	86674f96	agency_banking_withdrawal transaction create: GHS 3000	{"fee": 30, "action": "create", "amount": 3000, "reference": "AGENCY-1751202938190", "partnerBank": "GCB", "customerName": "gsgsfg", "accountNumber": "56374674567567", "floatAffected": 3000, "glTransactionId": "c45f3d2f-ec5e-4d05-bca7-6b1c74492321", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -3000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-29 13:15:39.150478+00	2025-06-29 13:15:39.150478+00	\N
1980	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	02e5c4f7-3a60-455e-b6f4-a30375d22c17	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 0, "type": "withdrawal", "amount": 200, "card_number": "78623658", "customer_name": "Suadik", "settlement_account": "GCB"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 13:34:10.027394+00	2025-06-29 13:34:10.027394+00	\N
1981	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751231978663_712	jumia_package_received action on jumia_transaction	{"tracking_id": "79827394857", "customer_name": "lsdlkfjl", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:19:45.105608+00	2025-06-29 21:19:45.105608+00	\N
1982	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751231978663_712	jumia_package_received action on jumia_transaction	{"tracking_id": "79827394857", "customer_name": "lsdlkfjl", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:19:50.792607+00	2025-06-29 21:19:50.792607+00	\N
1983	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751231978663_712	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "79827394857", "customer_name": "lsdlkfjl", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:19:51.985636+00	2025-06-29 21:19:51.985636+00	\N
1984	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751232043939_445	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "8728945949", "total_debits": 200, "customer_name": "kldjfhasjf", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:20:50.412374+00	2025-06-29 21:20:50.412374+00	\N
1985	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751232043939_445	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "8728945949", "total_debits": 200, "customer_name": "kldjfhasjf", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:20:56.890965+00	2025-06-29 21:20:56.890965+00	\N
1986	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751232043939_445	Jumia pod_collection transaction completed successfully	{"amount": 200, "gl_posted": true, "tracking_id": "8728945949", "customer_name": "kldjfhasjf", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:20:57.954482+00	2025-06-29 21:20:57.954482+00	\N
1987	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	2c223bd4-91e1-4410-9f00-432758dc88af	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 0, "type": "withdrawal", "amount": 100, "card_number": "8729857", "customer_name": "asjdfk", "settlement_account": "GCB"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-29 21:32:32.308228+00	2025-06-29 21:32:32.308228+00	\N
1988	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_card_issuance	ezwich_card_issuance	64a5b7db-2943-4dd8-8307-0aa5748b6b34	ezwich_card_issuance action on ezwich_card_issuance	{"fee": 15, "batch_code": "BATCH-1750888141471-EPIF", "card_number": "3849823434", "partner_bank": "E-Zwich Ghana", "customer_name": "Mohammed Salim Abdul Majeed", "payment_method": "cash"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-30 10:09:38.604132+00	2025-06-30 10:09:38.604132+00	\N
1989	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	73d7e500	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "AGENCY-1751278388582", "partnerBank": "GCB", "customerName": "alfkjalskdjf", "accountNumber": "9827359827495", "floatAffected": -1000, "glTransactionId": "56457f2a-ee72-4742-a9f6-376532236e49", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 10:13:08.552346+00	2025-06-30 10:13:08.552346+00	\N
1990	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	2fe4cda6	agency_banking_deposit transaction create: GHS 1000	{"fee": 10, "action": "create", "amount": 1000, "reference": "AGENCY-1751290075289", "partnerBank": "GCB", "customerName": "sdlaksjdf", "accountNumber": "72983479578234", "floatAffected": -1000, "glTransactionId": "dfa01947-358e-4265-887b-c29b71adc7f8", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 13:27:55.028355+00	2025-06-30 13:27:55.028355+00	\N
1991	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	9c7719a0	agency_banking_withdrawal transaction create: GHS 484.21	{"fee": 0, "action": "create", "amount": 484.21, "reference": "AGENCY-1751291999013", "partnerBank": "Fidelity", "customerName": "alsdjflkj", "accountNumber": "98479258734", "floatAffected": 484.21, "glTransactionId": "7b1c3b93-f65e-401a-ba7d-d013fc01efaa", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -484.21}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 13:59:58.708796+00	2025-06-30 13:59:58.708796+00	\N
1992	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	9661dc26	agency_banking_withdrawal transaction create: GHS 600	{"fee": 0, "action": "create", "amount": 600, "reference": "AGENCY-1751292049697", "partnerBank": "Fidelity", "customerName": "ladslfjk", "accountNumber": "98048379382574", "floatAffected": 600, "glTransactionId": "fd9c15a7-f3b0-47c0-86e7-c8561e24e18b", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -600}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:00:49.378868+00	2025-06-30 14:00:49.378868+00	\N
1993	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	04c79b20	agency_banking_withdrawal transaction create: GHS 484.21	{"fee": 0, "action": "create", "amount": 484.21, "reference": "AGENCY-1751292282671", "partnerBank": "Fidelity", "customerName": "kljflajksdf", "accountNumber": "98273459872345", "floatAffected": 484.21, "glTransactionId": "e6e30264-019d-4517-a3c1-bde93a813642", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -484.21}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:04:42.365242+00	2025-06-30 14:04:42.365242+00	\N
1994	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	1a8c9c3c	agency_banking_withdrawal transaction create: GHS 3000	{"fee": 0, "action": "create", "amount": 3000, "reference": "AGENCY-1751293585756", "partnerBank": "GCB", "customerName": "akjsdlfjsd", "accountNumber": "279458273495", "floatAffected": 3000, "glTransactionId": "a3ab6208-65ab-4530-a3a3-f7adf971b87f", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -3000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:26:25.420584+00	2025-06-30 14:26:25.420584+00	\N
1995	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	bd629eb0	agency_banking_deposit transaction create: GHS 3000	{"fee": 0, "action": "create", "amount": 3000, "reference": "AGENCY-1751293634516", "partnerBank": "GCB", "customerName": "LJHLSKDAF LKASJD", "accountNumber": "93274592834758", "floatAffected": -3000, "glTransactionId": "dda37a69-3aa1-4968-a410-2ff563b575dc", "transactionType": "agency_banking_deposit", "cashTillAffected": 3000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:27:14.175971+00	2025-06-30 14:27:14.175971+00	\N
1996	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	5e7bd0e2	agency_banking_withdrawal transaction create: GHS 3000	{"fee": 0, "action": "create", "amount": 3000, "reference": "AGENCY-1751294152235", "partnerBank": "GCB", "customerName": "jalksdjflkjsd", "accountNumber": "2973495873434", "floatAffected": 3000, "glTransactionId": "db07bc91-6e11-437a-a669-23cd50b5145e", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -3000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:35:51.886109+00	2025-06-30 14:35:51.886109+00	\N
1997	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	6f36f61b	agency_banking_withdrawal transaction create: GHS 3000	{"fee": 0, "action": "create", "amount": 3000, "reference": "AGENCY-1751294181764", "partnerBank": "GCB", "customerName": "lajsdfjl", "accountNumber": "98027349857243", "floatAffected": 3000, "glTransactionId": "49cece8e-43bd-4c14-b64f-d9366eb64ac7", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -3000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:36:21.416802+00	2025-06-30 14:36:21.416802+00	\N
1998	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_withdrawal	9001a683	agency_banking_withdrawal transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "AGENCY-1751294348440", "partnerBank": "GCB", "customerName": "jlksjfglkfdg", "accountNumber": "27984739843485", "floatAffected": 1000, "glTransactionId": "fb5cdb4b-c6ce-4dd6-861c-9552568f9582", "transactionType": "agency_banking_withdrawal", "cashTillAffected": -1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:39:08.076594+00	2025-06-30 14:39:08.076594+00	\N
1999	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_deposit	d706538b	agency_banking_deposit transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "AGENCY-1751294404505", "partnerBank": "GCB", "customerName": "ljkajsdlfkj", "accountNumber": "934952349587", "floatAffected": -1000, "glTransactionId": "1ab9589c-602e-4a46-b82c-57bf603fd47e", "transactionType": "agency_banking_deposit", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 14:40:04.177264+00	2025-06-30 14:40:04.177264+00	\N
2000	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	transaction_create	agency_banking_interbank	bcad027a	agency_banking_interbank transaction create: GHS 1000	{"fee": 0, "action": "create", "amount": 1000, "reference": "AGENCY-1751296547031", "partnerBank": "GCB", "customerName": "llajs lkajsdlfkj", "accountNumber": "983274958734", "floatAffected": -1000, "glTransactionId": "62ff46e3-7e2c-47c0-af23-1de044b29eec", "transactionType": "agency_banking_interbank", "cashTillAffected": 1000}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	success	\N	\N	\N	2025-06-30 15:15:46.644669+00	2025-06-30 15:15:46.644669+00	\N
2001	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	217c2b0b-9796-4299-818d-6042dfe7595d	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 0, "type": "withdrawal", "amount": 100, "card_number": "2638764264", "customer_name": "afsdfadsf", "settlement_account": "GHIPPS"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-30 21:34:09.142361+00	2025-06-30 21:34:09.142361+00	\N
2002	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	ac8a6554-67e9-47d9-92b6-f4ae29f98079	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 10, "type": "withdrawal", "amount": 100, "card_number": "4875278554", "customer_name": "dhfkajsfh", "settlement_account": "GHIPPS"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-30 21:49:09.141009+00	2025-06-30 21:49:09.141009+00	\N
2003	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	ezwich_withdrawal	ezwich_withdrawal	44216b89-d063-4cd8-8fc2-2861c103433c	ezwich_withdrawal action on ezwich_withdrawal	{"fee": 50, "type": "withdrawal", "amount": 500, "card_number": "2361748623", "customer_name": "Mohammed Salim", "settlement_account": "GHIPPS"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-06-30 22:05:39.011472+00	2025-06-30 22:05:39.011472+00	\N
2004	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751401027132_518	jumia_package_received action on jumia_transaction	{"tracking_id": "27894759847", "customer_name": "jdlahf", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:17:10.629705+00	2025-07-01 20:17:10.629705+00	\N
2005	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751401027132_518	jumia_package_received action on jumia_transaction	{"tracking_id": "27894759847", "customer_name": "jdlahf", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:17:13.205526+00	2025-07-01 20:17:13.205526+00	\N
2006	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751401027132_518	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "27894759847", "customer_name": "jdlahf", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:17:13.95022+00	2025-07-01 20:17:13.95022+00	\N
2007	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751401067225_586	jumia_pod_collection_processed action on jumia_transaction	{"amount": 100, "gl_posted": true, "tracking_id": "Y8273423", "total_debits": 100, "customer_name": "Mohammed", "total_credits": 100, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:17:55.253827+00	2025-07-01 20:17:55.253827+00	\N
2008	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751401067225_586	jumia_pod_collection_processed action on jumia_transaction	{"amount": 100, "gl_posted": true, "tracking_id": "Y8273423", "total_debits": 100, "customer_name": "Mohammed", "total_credits": 100, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:17:59.87099+00	2025-07-01 20:17:59.87099+00	\N
2009	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751401067225_586	Jumia pod_collection transaction completed successfully	{"amount": 100, "gl_posted": true, "tracking_id": "Y8273423", "customer_name": "Mohammed", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:18:00.590774+00	2025-07-01 20:18:00.590774+00	\N
2010	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751401942101_220	jumia_package_received action on jumia_transaction	{"tracking_id": "KJOI34Y8", "customer_name": "Abdul", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:32:25.869132+00	2025-07-01 20:32:25.869132+00	\N
2011	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751401942101_220	jumia_package_received action on jumia_transaction	{"tracking_id": "KJOI34Y8", "customer_name": "Abdul", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:32:28.421995+00	2025-07-01 20:32:28.421995+00	\N
2012	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751401942101_220	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "KJOI34Y8", "customer_name": "Abdul", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:32:29.094105+00	2025-07-01 20:32:29.094105+00	\N
2013	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751401972871_772	jumia_pod_collection_processed action on jumia_transaction	{"amount": 2000, "gl_posted": true, "tracking_id": "72698538945", "total_debits": 2000, "customer_name": "kasldf", "total_credits": 2000, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:33:01.197761+00	2025-07-01 20:33:01.197761+00	\N
2014	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751401972871_772	jumia_pod_collection_processed action on jumia_transaction	{"amount": 2000, "gl_posted": true, "tracking_id": "72698538945", "total_debits": 2000, "customer_name": "kasldf", "total_credits": 2000, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:33:06.201725+00	2025-07-01 20:33:06.201725+00	\N
2015	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751401972871_772	Jumia pod_collection transaction completed successfully	{"amount": 2000, "gl_posted": true, "tracking_id": "72698538945", "customer_name": "kasldf", "transaction_type": "pod_collection"}	\N	\N	medium	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:33:07.013768+00	2025-07-01 20:33:07.013768+00	\N
2016	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751402748658_110	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "34234524", "total_debits": 200, "customer_name": "asafsfa", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:46:03.415407+00	2025-07-01 20:46:03.415407+00	\N
2017	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751402748658_110	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "34234524", "total_debits": 200, "customer_name": "asafsfa", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:46:09.726211+00	2025-07-01 20:46:09.726211+00	\N
2018	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751402748658_110	Jumia pod_collection transaction completed successfully	{"amount": 200, "gl_posted": true, "tracking_id": "34234524", "customer_name": "asafsfa", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:46:10.574029+00	2025-07-01 20:46:10.574029+00	\N
2019	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751402802329_91	jumia_package_received action on jumia_transaction	{"tracking_id": "363452345", "customer_name": "asdfasdfsdf", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:46:46.745339+00	2025-07-01 20:46:46.745339+00	\N
2020	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_received	jumia_transaction	PAC_1751402802329_91	jumia_package_received action on jumia_transaction	{"tracking_id": "363452345", "customer_name": "asdfasdfsdf", "transaction_type": "package_receipt", "gl_accounts_ready": true}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:46:49.656457+00	2025-07-01 20:46:49.656457+00	\N
2021	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_package_receipt_completed	jumia_transaction	PAC_1751402802329_91	Jumia package_receipt transaction completed successfully	{"amount": 0, "gl_posted": true, "tracking_id": "363452345", "customer_name": "asdfasdfsdf", "transaction_type": "package_receipt"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 20:46:50.478994+00	2025-07-01 20:46:50.478994+00	\N
2022	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751403959850_377	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "23422525", "total_debits": 200, "customer_name": "dvdfasdfasdf", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 21:06:10.343174+00	2025-07-01 21:06:10.343174+00	\N
2023	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_processed	jumia_transaction	POD_1751403959850_377	jumia_pod_collection_processed action on jumia_transaction	{"amount": 200, "gl_posted": true, "tracking_id": "23422525", "total_debits": 200, "customer_name": "dvdfasdfasdf", "total_credits": 200, "gl_entries_count": 2, "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 21:06:15.824737+00	2025-07-01 21:06:15.824737+00	\N
2024	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed Salim	jumia_pod_collection_completed	jumia_transaction	POD_1751403959850_377	Jumia pod_collection transaction completed successfully	{"amount": 200, "gl_posted": true, "tracking_id": "23422525", "customer_name": "dvdfasdfasdf", "transaction_type": "pod_collection"}	\N	\N	low	635844ab-029a-43f8-8523-d7882915266a	\N	success	\N	\N	\N	2025-07-01 21:06:16.592131+00	2025-07-01 21:06:16.592131+00	\N
\.


--
-- Data for Name: branch_partner_banks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branch_partner_banks (id, branch_id, partner_bank_id, float_account_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branches (id, name, code, location, region, manager, contact_phone, email, staff_count, status, address, phone, created_at, updated_at) FROM stdin;
45924a0f-eca7-4e34-ad4f-a86272ad72d9	Cape Coast Branch	CAP001	Kotokoraba, Cape Coast	central	Mubarik Abdul-Wahab		capecoast@example.com	0	active	32 Castle Road, Cape Coast		2025-05-22 21:45:29.127347+00	2025-06-29 19:33:03.045603+00
a0bf870c-b7b7-437d-aaf6-e3fa54831545	Community Center	CC002	Yendi	Nothern	Mubarik Abdul-Wahab		communitycenter@mimhaad.com	0	active	Community Center, Yendi Municipal	+233506068893	2025-06-04 12:10:52.64977+00	2025-06-29 19:39:18.251777+00
635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	HT-001	Yendi	northern	Mubarik Abdul-Wahab		admin@mimhaad.com	0	active	Test	+23354951461	2025-05-22 22:03:05.594177+00	2025-06-29 19:39:46.221127+00
\.


--
-- Data for Name: cash_till; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cash_till (id, branch_id, date, amount, opening_balance, closing_balance, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cash_till_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cash_till_accounts (id, name, current_balance, branch_id, created_at, updated_at) FROM stdin;
ecc5578e-6e84-4909-a37f-655fb43437fd	Hill Top Branch - Cash Till	0.00	635844ab-029a-43f8-8523-d7882915266a	2025-06-28 11:21:20.870798+00	2025-06-28 11:21:20.870798+00
\.


--
-- Data for Name: commission_approvals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.commission_approvals (id, commission_id, action, notes, approved_at, approved_by_id, approved_by_name) FROM stdin;
\.


--
-- Data for Name: commission_comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.commission_comments (id, commission_id, text, created_at, created_by_id, created_by_name) FROM stdin;
\.


--
-- Data for Name: commission_metadata; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.commission_metadata (id, commission_id, transaction_volume, commission_rate, settlement_period, created_at) FROM stdin;
\.


--
-- Data for Name: commission_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.commission_payments (id, commission_id, status, method, received_at, bank_account, reference_number, notes, processed_by_id, processed_by_name, processed_at) FROM stdin;
\.


--
-- Data for Name: commissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.commissions (id, source, source_name, amount, month, reference, description, status, gl_account, gl_account_name, created_at, updated_at, created_by_name, updated_by_id, updated_by_name, branch_id, branch_name, transaction_volume, commission_rate, receipt_path, notes, created_by, receipt_url) FROM stdin;
c0362154-df7e-4a52-a2c0-701e1377b3d6	vodafone	Vodafone Cash	2000.00	2025-06-01	VOD-202506-TRPA		paid	\N	\N	2025-06-24 21:38:54.8752+00	2025-06-25 08:27:14.694422+00	System User	\N	\N	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	2000	1.0000	\N		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	\N
f8a7a2d4-e62d-412b-91fe-b19546a8e7bd	vra	VRA (Electricity)	2000.00	2025-06-01	VRA-202506-9THD		paid	\N	\N	2025-06-29 21:09:37.64045+00	2025-06-29 21:09:37.64045+00	System User	\N	\N	635844ab-029a-43f8-8523-d7882915266a	Hill Top Branch	2000	1.0000	\N		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	\N
\.


--
-- Data for Name: e_zwich_card_issuances; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.e_zwich_card_issuances (id, card_number, partner_bank, customer_name, customer_phone, customer_email, date_of_birth, gender, address_line1, id_type, id_number, fee_charged, payment_method, reference, branch_id, issued_by, status, created_at, updated_at, customer_photo, id_photo, pin_hash, card_status, issue_date, id_expiry_date, address_line2, city, region, postal_code, user_id, processed_by, username) FROM stdin;
a5754256-6be8-46f9-9db4-b9ed53b5b99f	97324758	absa	Mohammed Salim Abdul-Majeed	+233549514616	msalim@smassglobal.com	2025-06-04	male	Malijor School Junction	ghana_card	GHA-348724024-8	15.00	cash	\N	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	completed	2025-06-25 09:07:38.1091+00	2025-06-25 09:07:38.1091+00	\N	\N	\N	active	2025-06-25	\N	\N	Adenta Municipal	Upper East	\N	\N	\N	\N
9e74735a-c34b-4a5f-b048-4c7ace2d2653	00017	GCB	Mohammed Salim Charles & Charles Abdul-Majeed	+233549514616	abdulmajeedsalim8@outlook.com	2007-06-11	male	Malijor School Junction	ghana_card	GHA-348724024-8	15.00	cash	CARD-00017-1751038766767	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	completed	2025-06-27 15:39:26.703552+00	2025-06-27 15:39:26.703552+00	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QMeRXhpZgAATU0AKgAAAAgABAE7AAIAAAAYAAABSodpAAQAAAABAAABYpydAAEAAAAwAAAC5uocAAcAAAEMAAAAPgAAAAAc6gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVmVjdG9yU3RvY2suY29tLzIwNTExNDIAAAaQAAAHAAAABDAyMzGQAwACAAAAFAAAAryQBAACAAAAFAAAAtCSkQACAAAAAzAwAACSkgACAAAAAzAwAADqHAAHAAABDAAAAbAAAAAAHOoAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIwMjQ6MTA6MzEgMDc6MDU6MzQAMjAyNDoxMDozMSAwNzowNTozNAAAAFYAZQBjAHQAbwByAFMAdABvAGMAawAuAGMAbwBtAC8AMgAwADUAMQAxADQAMgAAAP/hBCZodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIi8+PHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6ZmFmNWJkZDUtYmEzZC0xMWRhLWFkMzEtZDMzZDc1MTgyZjFiIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPjx4bXA6Q3JlYXRlRGF0ZT4yMDI0LTEwLTMxVDA3OjA1OjM0PC94bXA6Q3JlYXRlRGF0ZT48L3JkZjpEZXNjcmlwdGlvbj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+PGRjOmNyZWF0b3I+PHJkZjpTZXEgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOmxpPlZlY3RvclN0b2NrLmNvbS8yMDUxMTQyPC9yZGY6bGk+PC9yZGY6U2VxPg0KCQkJPC9kYzpjcmVhdG9yPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgCCwHDAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopCQvJOBXHeO/i14Y+HdibnWdUggA6JvG4/hTSb2E2ludlSFgK+Lvid/wUI0nT7e8tfDsPnTbcRXBPGa+aNV/bU+JerTb49eWBfRV6VvGhORjKtGJ+qGv+LtJ8M2Ml3f3kUEUfXcwzXnP/DVXw8W4khbWUDxjJr8rvFnxr8V+KFkGqa3cXQY5KhyBXASeJJC29JXWQ/e3Ma2jh+7MXiH0R+0Fl+0l4Avo1dNehUN03HFXV+P3gJrlYP+Eks1lborSAE1+Kn/AAmt1GFCTOqjr85p03iuSa5juZJ3+0LwuGPSn9XXcPby7H7hw/E7wtcFQmt2jFun7wc10dvcxXUSywyLJG3IZTkGvwqXx9rkc8c8WpT8dF3cCvb/AA7+2H8QdB0W2srW+U+WAA0nNS8M+jLVbuj9a6K+LvgP+3hY6v5Gk+MB5F6+ALpB8n419c6P4u0bXreOex1G3uI3GQUcGuWUJRdmbxkpbGxRSA55HIpagsKKKKAC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	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAvsAAAFWCAYAAAD361LjAAAAAXNSR0IArs4c6QAAJVZ0RVh0bXhmaWxlACUzQ214ZmlsZSUyMGhvc3QlM0QlMjJhcHAuZGlhZ3JhbXMubmV0JTIyJTIwYWdlbnQlM0QlMjJNb3ppbGxhJTJGNS4wJTIwKFdpbmRvd3MlMjBOVCUyMDEwLjAlM0IlMjBXaW42NCUzQiUyMHg2NCklMjBBcHBsZVdlYktpdCUyRjUzNy4zNiUyMChLSFRNTCUyQyUyMGxpa2UlMjBHZWNrbyklMjBDaHJvbWUlMkYxMzcuMC4wLjAlMjBTYWZhcmklMkY1MzcuMzYlMjBFZGclMkYxMzcuMC4wLjAlMjIlMjB2ZXJzaW9uJTNEJTIyMjcuMS42JTIyJTIwc2NhbGUlM0QlMjIxJTIyJTIwYm9yZGVyJTNEJTIyMCUyMiUzRSUwQSUyMCUyMCUzQ2RpYWdyYW0lMjBuYW1lJTNEJTIyUGFnZS0xJTIyJTIwaWQlM0QlMjJna1NXVkl5aG1pUXBGLTFrd0tXQyUyMiUzRSUwQSUyMCUyMCUyMCUyMCUzQ214R3JhcGhNb2RlbCUyMGR4JTNEJTIyMTQxOCUyMiUyMGR5JTNEJTIyNzUyJTIyJTIwZ3JpZCUzRCUyMjElMjIlMjBncmlkU2l6ZSUzRCUyMjEwJTIyJTIwZ3VpZGVzJTNEJTIyMSUyMiUyMHRvb2x0aXBzJTNEJTIyMSUyMiUyMGNvbm5lY3QlM0QlMjIxJTIyJTIwYXJyb3dzJTNEJTIyMSUyMiUyMGZvbGQlM0QlMjIxJTIyJTIwcGFnZSUzRCUyMjElMjIlMjBwYWdlU2NhbGUlM0QlMjIxJTIyJTIwcGFnZVdpZHRoJTNEJTIyODUwJTIyJTIwcGFnZUhlaWdodCUzRCUyMjExMDAlMjIlMjBtYXRoJTNEJTIyMCUyMiUyMHNoYWRvdyUzRCUyMjAlMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlM0Nyb290JTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjIwJTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjIxJTIyJTIwcGFyZW50JTNEJTIyMCUyMiUyMCUyRiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214Q2VsbCUyMGlkJTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtMTMlMjIlMjBzdHlsZSUzRCUyMmVkZ2VTdHlsZSUzRG9ydGhvZ29uYWxFZGdlU3R5bGUlM0Jyb3VuZGVkJTNEMCUzQm9ydGhvZ29uYWxMb29wJTNEMSUzQmpldHR5U2l6ZSUzRGF1dG8lM0JodG1sJTNEMSUzQmVudHJ5WCUzRDElM0JlbnRyeVklM0QwLjc1JTNCZW50cnlEeCUzRDAlM0JlbnRyeUR5JTNEMCUzQiUyMiUyMGVkZ2UlM0QlMjIxJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUyMHNvdXJjZSUzRCUyMnIySXp3MkZDM3hGaXo4ZGxncU12LTElMjIlMjB0YXJnZXQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xMCUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjByZWxhdGl2ZSUzRCUyMjElMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xJTIyJTIwdmFsdWUlM0QlMjIlMjIlMjBzdHlsZSUzRCUyMnNoYXBlJTNEaW1hZ2UlM0JodG1sJTNEMSUzQnZlcnRpY2FsQWxpZ24lM0R0b3AlM0J2ZXJ0aWNhbExhYmVsUG9zaXRpb24lM0Rib3R0b20lM0JsYWJlbEJhY2tncm91bmRDb2xvciUzRCUyM2ZmZmZmZiUzQmltYWdlQXNwZWN0JTNEMCUzQmFzcGVjdCUzRGZpeGVkJTNCaW1hZ2UlM0RodHRwcyUzQSUyRiUyRmNkbjAuaWNvbmZpbmRlci5jb20lMkZkYXRhJTJGaWNvbnMlMkZrYW1lbGVvbi1mcmVlLXBhY2slMkYxMTAlMkZIYWNrZXItMTI4LnBuZyUyMiUyMHZlcnRleCUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhHZW9tZXRyeSUyMHglM0QlMjI2NTAlMjIlMjB5JTNEJTIyNTAlMjIlMjB3aWR0aCUzRCUyMjEyOCUyMiUyMGhlaWdodCUzRCUyMjEyOCUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlMjAlMkYlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0MlMkZteENlbGwlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteENlbGwlMjBpZCUzRCUyMnIySXp3MkZDM3hGaXo4ZGxncU12LTEyJTIyJTIwc3R5bGUlM0QlMjJlZGdlU3R5bGUlM0RvcnRob2dvbmFsRWRnZVN0eWxlJTNCcm91bmRlZCUzRDAlM0JvcnRob2dvbmFsTG9vcCUzRDElM0JqZXR0eVNpemUlM0RhdXRvJTNCaHRtbCUzRDElM0IlMjIlMjBlZGdlJTNEJTIyMSUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjBzb3VyY2UlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0yJTIyJTIwdGFyZ2V0JTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtNyUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjByZWxhdGl2ZSUzRCUyMjElMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0yJTIyJTIwdmFsdWUlM0QlMjIlMjIlMjBzdHlsZSUzRCUyMmltYWdlJTNCaHRtbCUzRDElM0JpbWFnZSUzRGltZyUyRmxpYiUyRmNsaXBfYXJ0JTJGbmV0d29ya2luZyUyRkZpcmV3YWxsXzAyXzEyOHgxMjgucG5nJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUyMHBhcmVudCUzRCUyMjElMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteEdlb21ldHJ5JTIweCUzRCUyMjM0NSUyMiUyMHklM0QlMjIyMjAlMjIlMjB3aWR0aCUzRCUyMjgwJTIyJTIwaGVpZ2h0JTNEJTIyODAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xNCUyMiUyMHN0eWxlJTNEJTIyZWRnZVN0eWxlJTNEb3J0aG9nb25hbEVkZ2VTdHlsZSUzQnJvdW5kZWQlM0QwJTNCb3J0aG9nb25hbExvb3AlM0QxJTNCamV0dHlTaXplJTNEYXV0byUzQmh0bWwlM0QxJTNCJTIyJTIwZWRnZSUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTIwc291cmNlJTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtNSUyMiUyMHRhcmdldCUzRCUyMnIySXp3MkZDM3hGaXo4ZGxncU12LTIlMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteEdlb21ldHJ5JTIwcmVsYXRpdmUlM0QlMjIxJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUyMCUyRiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQyUyRm14Q2VsbCUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214Q2VsbCUyMGlkJTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtNSUyMiUyMHZhbHVlJTNEJTIyJTIyJTIwc3R5bGUlM0QlMjJzaGFwZSUzRG14Z3JhcGguY2lzY28ucGVvcGxlLnBjX21hbiUzQmh0bWwlM0QxJTNCcG9pbnRlckV2ZW50cyUzRDElM0JkYXNoZWQlM0QwJTNCZmlsbENvbG9yJTNEJTIzMDM2ODk3JTNCc3Ryb2tlQ29sb3IlM0QlMjNmZmZmZmYlM0JzdHJva2VXaWR0aCUzRDIlM0J2ZXJ0aWNhbExhYmVsUG9zaXRpb24lM0Rib3R0b20lM0J2ZXJ0aWNhbEFsaWduJTNEdG9wJTNCYWxpZ24lM0RjZW50ZXIlM0JvdXRsaW5lQ29ubmVjdCUzRDAlM0IlMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjB4JTNEJTIyNTYwJTIyJTIweSUzRCUyMjIzMSUyMiUyMHdpZHRoJTNEJTIyMTA0JTIyJTIwaGVpZ2h0JTNEJTIyMTQ5JTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUyMCUyRiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQyUyRm14Q2VsbCUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214Q2VsbCUyMGlkJTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtOSUyMiUyMHN0eWxlJTNEJTIyZWRnZVN0eWxlJTNEb3J0aG9nb25hbEVkZ2VTdHlsZSUzQnJvdW5kZWQlM0QwJTNCb3J0aG9nb25hbExvb3AlM0QxJTNCamV0dHlTaXplJTNEYXV0byUzQmh0bWwlM0QxJTNCZW50cnlYJTNEMCUzQmVudHJ5WSUzRDAuNzUlM0JlbnRyeUR4JTNEMCUzQmVudHJ5RHklM0QwJTNCJTIyJTIwZWRnZSUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTIwc291cmNlJTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtNyUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjByZWxhdGl2ZSUzRCUyMjElMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhQb2ludCUyMHglM0QlMjIxMjQuNjMyNjY5NjUxNzMwNTclMjIlMjB5JTNEJTIyMTg5LjI4MDM5ODIwODk2MTYzJTIyJTIwYXMlM0QlMjJ0YXJnZXRQb2ludCUyMiUyMCUyRiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQyUyRm14R2VvbWV0cnklM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0MlMkZteENlbGwlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteENlbGwlMjBpZCUzRCUyMnIySXp3MkZDM3hGaXo4ZGxncU12LTclMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyaW1hZ2UlM0JodG1sJTNEMSUzQmltYWdlJTNEaW1nJTJGbGliJTJGY2xpcF9hcnQlMkZjb21wdXRlcnMlMkZTZXJ2ZXJfVG93ZXJfMTI4eDEyOC5wbmclMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjB4JTNEJTIyMTcwJTIyJTIweSUzRCUyMjI1MCUyMiUyMHdpZHRoJTNEJTIyODAlMjIlMjBoZWlnaHQlM0QlMjI4MCUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlMjAlMkYlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0MlMkZteENlbGwlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteENlbGwlMjBpZCUzRCUyMnIySXp3MkZDM3hGaXo4ZGxncU12LTglMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyaW1hZ2UlM0Jhc3BlY3QlM0RmaXhlZCUzQnBlcmltZXRlciUzRGVsbGlwc2VQZXJpbWV0ZXIlM0JodG1sJTNEMSUzQmFsaWduJTNEY2VudGVyJTNCc2hhZG93JTNEMCUzQmRhc2hlZCUzRDAlM0JzcGFjaW5nVG9wJTNEMyUzQmltYWdlJTNEaW1nJTJGbGliJTJGYWN0aXZlX2RpcmVjdG9yeSUyRmRhdGFiYXNlX3NlcnZlci5zdmclM0IlMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjB4JTNEJTIyOTAlMjIlMjB5JTNEJTIyOTAlMjIlMjB3aWR0aCUzRCUyMjkwLjIlMjIlMjBoZWlnaHQlM0QlMjIxMTAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xMSUyMiUyMHN0eWxlJTNEJTIyZWRnZVN0eWxlJTNEb3J0aG9nb25hbEVkZ2VTdHlsZSUzQnJvdW5kZWQlM0QwJTNCb3J0aG9nb25hbExvb3AlM0QxJTNCamV0dHlTaXplJTNEYXV0byUzQmh0bWwlM0QxJTNCJTIyJTIwZWRnZSUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTIwc291cmNlJTNEJTIycjJJencyRkMzeEZpejhkbGdxTXYtMTAlMjIlMjB0YXJnZXQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0yJTIyJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhHZW9tZXRyeSUyMHJlbGF0aXZlJTNEJTIyMSUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlMjAlMkYlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0MlMkZteENlbGwlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteENlbGwlMjBpZCUzRCUyMnIySXp3MkZDM3hGaXo4ZGxncU12LTEwJTIyJTIwdmFsdWUlM0QlMjIlMjIlMjBzdHlsZSUzRCUyMmltYWdlJTNCYXNwZWN0JTNEZml4ZWQlM0JwZXJpbWV0ZXIlM0RlbGxpcHNlUGVyaW1ldGVyJTNCaHRtbCUzRDElM0JhbGlnbiUzRGNlbnRlciUzQnNoYWRvdyUzRDAlM0JkYXNoZWQlM0QwJTNCc3BhY2luZ1RvcCUzRDMlM0JpbWFnZSUzRGltZyUyRmxpYiUyRmFjdGl2ZV9kaXJlY3RvcnklMkZpbnRlcm5ldF9jbG91ZC5zdmclM0IlMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ214R2VvbWV0cnklMjB4JTNEJTIyMzAwJTIyJTIweSUzRCUyMjM5JTIyJTIwd2lkdGglM0QlMjIxNjAuMzIlMjIlMjBoZWlnaHQlM0QlMjIxMDElMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xNiUyMiUyMHZhbHVlJTNEJTIyRW1wbG95ZWUlMjIlMjBzdHlsZSUzRCUyMnRleHQlM0JodG1sJTNEMSUzQmFsaWduJTNEY2VudGVyJTNCdmVydGljYWxBbGlnbiUzRG1pZGRsZSUzQnJlc2l6YWJsZSUzRDAlM0Jwb2ludHMlM0QlNUIlNUQlM0JhdXRvc2l6ZSUzRDElM0JzdHJva2VDb2xvciUzRG5vbmUlM0JmaWxsQ29sb3IlM0Rub25lJTNCJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUyMHBhcmVudCUzRCUyMjElMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteEdlb21ldHJ5JTIweCUzRCUyMjY1MCUyMiUyMHklM0QlMjIzMDAlMjIlMjB3aWR0aCUzRCUyMjgwJTIyJTIwaGVpZ2h0JTNEJTIyMzAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xNyUyMiUyMHZhbHVlJTNEJTIyVGhyZWF0JTIwQWN0b3IlMjIlMjBzdHlsZSUzRCUyMnRleHQlM0JodG1sJTNEMSUzQmFsaWduJTNEY2VudGVyJTNCdmVydGljYWxBbGlnbiUzRG1pZGRsZSUzQnJlc2l6YWJsZSUzRDAlM0Jwb2ludHMlM0QlNUIlNUQlM0JhdXRvc2l6ZSUzRDElM0JzdHJva2VDb2xvciUzRG5vbmUlM0JmaWxsQ29sb3IlM0Rub25lJTNCJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUyMHBhcmVudCUzRCUyMjElMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteEdlb21ldHJ5JTIweCUzRCUyMjY2OSUyMiUyMHklM0QlMjIxNjAlMjIlMjB3aWR0aCUzRCUyMjkwJTIyJTIwaGVpZ2h0JTNEJTIyMzAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xOCUyMiUyMHZhbHVlJTNEJTIySW50ZXJuZXQlMjIlMjBzdHlsZSUzRCUyMnRleHQlM0JodG1sJTNEMSUzQmFsaWduJTNEY2VudGVyJTNCdmVydGljYWxBbGlnbiUzRG1pZGRsZSUzQnJlc2l6YWJsZSUzRDAlM0Jwb2ludHMlM0QlNUIlNUQlM0JhdXRvc2l6ZSUzRDElM0JzdHJva2VDb2xvciUzRG5vbmUlM0JmaWxsQ29sb3IlM0Rub25lJTNCJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUyMHBhcmVudCUzRCUyMjElMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteEdlb21ldHJ5JTIweCUzRCUyMjQwMCUyMiUyMHklM0QlMjIxMzglMjIlMjB3aWR0aCUzRCUyMjYwJTIyJTIwaGVpZ2h0JTNEJTIyMzAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0xOSUyMiUyMHZhbHVlJTNEJTIyRmlyZXdhbGwlMjIlMjBzdHlsZSUzRCUyMnRleHQlM0JodG1sJTNEMSUzQmFsaWduJTNEY2VudGVyJTNCdmVydGljYWxBbGlnbiUzRG1pZGRsZSUzQnJlc2l6YWJsZSUzRDAlM0Jwb2ludHMlM0QlNUIlNUQlM0JhdXRvc2l6ZSUzRDElM0JzdHJva2VDb2xvciUzRG5vbmUlM0JmaWxsQ29sb3IlM0Rub25lJTNCJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUyMHBhcmVudCUzRCUyMjElMjIlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteEdlb21ldHJ5JTIweCUzRCUyMjM1MC4xNiUyMiUyMHklM0QlMjIzMDglMjIlMjB3aWR0aCUzRCUyMjYwJTIyJTIwaGVpZ2h0JTNEJTIyMzAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGbXhDZWxsJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhDZWxsJTIwaWQlM0QlMjJyMkl6dzJGQzN4Rml6OGRsZ3FNdi0yMCUyMiUyMHZhbHVlJTNEJTIyV2ViJTIwU2VydmVyJTIyJTIwc3R5bGUlM0QlMjJ0ZXh0JTNCaHRtbCUzRDElM0JhbGlnbiUzRGNlbnRlciUzQnZlcnRpY2FsQWxpZ24lM0RtaWRkbGUlM0JyZXNpemFibGUlM0QwJTNCcG9pbnRzJTNEJTVCJTVEJTNCYXV0b3NpemUlM0QxJTNCc3Ryb2tlQ29sb3IlM0Rub25lJTNCZmlsbENvbG9yJTNEbm9uZSUzQiUyMiUyMHZlcnRleCUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDbXhHZW9tZXRyeSUyMHglM0QlMjIxNjAlMjIlMjB5JTNEJTIyMzM4JTIyJTIwd2lkdGglM0QlMjI5MCUyMiUyMGhlaWdodCUzRCUyMjMwJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUyMCUyRiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQyUyRm14Q2VsbCUzRSUwQSUyMCUy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nY19+/ahZUta0GNkOtlNEggpAYr9kOJkZSRAAiQQVwQo9mNkOnNyclBVVYXWrVtj7ty5mDVrFubMmaP2/r333sNVV10VIyNhN0mABEJNgGI/1ERZHwmQAAnEDwGK/Ricy3nz5mHmzJmq6GciARIgAYp9rgESIAESIAFvBCj2Y3BtfPrpp/jwww8hn0wkQAIkQLHPNUACJEACJECxH0drYMGCBZg2bRrmz58fR6PiUEiABIIlQLEfLDmWIwESIIH4J0DLfgzO8WeffYb3338fIvqZSIAESIBin2uABEiABEiAlv04WgMLFy7Eu+++CxH9TCRAAiRAsc81QAIkQAIkQLEfR2tg0aJFePvttyGin4kESIAEKPa5BkiABEiABCj242gNLF68GG+88Qbkk4kESIAEKPa5BkiABEiABCj242gNfP7553jttdcgn0wkQAIkQLHPNUACJEACJECxH0drYMmSJXj55ZfxxRdfxNGoOBQSIIFgCVDsB0uO5UiABEgg/gkwGk8MzvGXX36JF198ESL6mUiABEiAYp9rgARIgARIgJb9OFoDX331FZ5//nmI6GciARIgAYp9rgESIAESIAGK/ThaA0uXLsWzzz4L+WQiARIgAYp9rgESIAESIAGK/ThaA19//TWefvppyCcTCZAACVDscw2QAAmQAAlQ7MfRGvj222/x5JNP4ptvvomjUXEoJEACRglMnToV999/P5566inceuut0MS+7OW5++678cQTT+COO+4wWh3zkQAJkAAJxDEBbtCNwcn97rvv8Pjjj0NEPxMJkEDdI1BYWIhmzZohISEBycnJyM/PR6NGjVBRUYHq6mrk5OSgQYMGdQ8MR0wCJEACJFCDAMV+DC6K77//Ho8++ihE9DORAAnUTQK333473n33XYjw16eHHnoIDz74YN2EwlGTAAmQAAlQ7MfDGvjhhx/w8MMPQ0Q/EwmQQN0kICK/ZcuWKC0tdQBITU1FdnY2rfp1c0lw1CRAAiTgkQAt+zG4MJYtW4YHHngA8slEAiRQdwm4W/dp1a+7a4EjJwESIAFvBCj2Y3Bt/Pjjj/jf//4H+WQiARKouwT01v169eohKyuLVv26uxw4chIgARKgZT9e1sBPP/2E++67D8uXL4+XIXEcJEACQRIQ6/6rr76qRuehr36QEFmMBEiABOKYAC37MTi5P//8M+65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	\N	active	2025-06-27	2025-07-11	\N	Adenta Municipal	Upper West	\N	\N	\N	\N
77921942-4733-4553-a315-0e8a012b3f2d	9827349587	E-Zwich Ghana	Mohammed	0542365789	msalim@gmail.om	2007-05-29	male	ashdlkf	ghana_card	GHA-829423445-2	15.00	cash	EZCARD-1751277630375	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	completed	2025-06-30 10:00:32.455203+00	2025-06-30 10:00:32.455203+00	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QMeRXhpZgAATU0AKgAAAAgABAE7AAIAAAAYAAABSodpAAQAAAABAAABYpydAAEAAAAwAAAC5uocAAcAAAEMAAAAPgAAAAAc6gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVmVjdG9yU3RvY2suY29tLzIwNTExNDIAAAaQAAAHAAAABDAyMzGQAwACAAAAFAAAAryQBAACAAAAFAAAAtCSkQACAAAAAzAwAACSkgACAAAAAzAwAADqHAAHAAABDAAAAbAAAAAAHOoAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIwMjQ6MTA6MzEgMDc6MDU6MzQAMjAyNDoxMDozMSAwNzowNTozNAAAAFYAZQBjAHQAbwByAFMAdABvAGMAawAuAGMAbwBtAC8AMgAwADUAMQAxADQAMgAAAP/hBCZodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIi8+PHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6ZmFmNWJkZDUtYmEzZC0xMWRhLWFkMzEtZDMzZDc1MTgyZjFiIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPjx4bXA6Q3JlYXRlRGF0ZT4yMDI0LTEwLTMxVDA3OjA1OjM0PC94bXA6Q3JlYXRlRGF0ZT48L3JkZjpEZXNjcmlwdGlvbj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+PGRjOmNyZWF0b3I+PHJkZjpTZXEgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOmxpPlZlY3RvclN0b2NrLmNvbS8yMDUxMTQyPC9yZGY6bGk+PC9yZGY6U2VxPg0KCQkJPC9kYzpjcmVhdG9yPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgCCwHDAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopCQvJOBXHeO/i14Y+HdibnWdUggA6JvG4/hTSb2E2ludlSFgK+Lvid/wUI0nT7e8tfDsPnTbcRXBPGa+aNV/bU+JerTb49eWBfRV6VvGhORjKtGJ+qGv+LtJ8M2Ml3f3kUEUfXcwzXnP/DVXw8W4khbWUDxjJr8rvFnxr8V+KFkGqa3cXQY5KhyBXASeJJC29JXWQ/e3Ma2jh+7MXiH0R+0Fl+0l4Avo1dNehUN03HFXV+P3gJrlYP+Eks1lborSAE1+Kn/AAmt1GFCTOqjr85p03iuSa5juZJ3+0LwuGPSn9XXcPby7H7hw/E7wtcFQmt2jFun7wc10dvcxXUSywyLJG3IZTkGvwqXx9rkc8c8WpT8dF3cCvb/AA7+2H8QdB0W2srW+U+WAA0nNS8M+jLVbuj9a6K+LvgP+3hY6v5Gk+MB5F6+ALpB8n419c6P4u0bXreOex1G3uI3GQUcGuWUJRdmbxkpbGxRSA55HIpagsKKKKAC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	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QMeRXhpZgAATU0AKgAAAAgABAE7AAIAAAAYAAABSodpAAQAAAABAAABYpydAAEAAAAwAAAC5uocAAcAAAEMAAAAPgAAAAAc6gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVmVjdG9yU3RvY2suY29tLzIwNTExNDIAAAaQAAAHAAAABDAyMzGQAwACAAAAFAAAAryQBAACAAAAFAAAAtCSkQACAAAAAzAwAACSkgACAAAAAzAwAADqHAAHAAABDAAAAbAAAAAAHOoAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIwMjQ6MTA6MzEgMDc6MDU6MzQAMjAyNDoxMDozMSAwNzowNTozNAAAAFYAZQBjAHQAbwByAFMAdABvAGMAawAuAGMAbwBtAC8AMgAwADUAMQAxADQAMgAAAP/hBCZodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIi8+PHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6ZmFmNWJkZDUtYmEzZC0xMWRhLWFkMzEtZDMzZDc1MTgyZjFiIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPjx4bXA6Q3JlYXRlRGF0ZT4yMDI0LTEwLTMxVDA3OjA1OjM0PC94bXA6Q3JlYXRlRGF0ZT48L3JkZjpEZXNjcmlwdGlvbj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+PGRjOmNyZWF0b3I+PHJkZjpTZXEgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOmxpPlZlY3RvclN0b2NrLmNvbS8yMDUxMTQyPC9yZGY6bGk+PC9yZGY6U2VxPg0KCQkJPC9kYzpjcmVhdG9yPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgCCwHDAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopCQvJOBXHeO/i14Y+HdibnWdUggA6JvG4/hTSb2E2ludlSFgK+Lvid/wUI0nT7e8tfDsPnTbcRXBPGa+aNV/bU+JerTb49eWBfRV6VvGhORjKtGJ+qGv+LtJ8M2Ml3f3kUEUfXcwzXnP/DVXw8W4khbWUDxjJr8rvFnxr8V+KFkGqa3cXQY5KhyBXASeJJC29JXWQ/e3Ma2jh+7MXiH0R+0Fl+0l4Avo1dNehUN03HFXV+P3gJrlYP+Eks1lborSAE1+Kn/AAmt1GFCTOqjr85p03iuSa5juZJ3+0LwuGPSn9XXcPby7H7hw/E7wtcFQmt2jFun7wc10dvcxXUSywyLJG3IZTkGvwqXx9rkc8c8WpT8dF3cCvb/AA7+2H8QdB0W2srW+U+WAA0nNS8M+jLVbuj9a6K+LvgP+3hY6v5Gk+MB5F6+ALpB8n419c6P4u0bXreOex1G3uI3GQUcGuWUJRdmbxkpbGxRSA55HIpagsKKKKAC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	\N	active	2025-06-30	2025-07-01	kljlaksjdf	kljasjdf	lkjlaskdjf	kljlaksdfj	\N	\N	\N
64a5b7db-2943-4dd8-8307-0aa5748b6b34	3849823434	E-Zwich Ghana	Mohammed Salim Abdul Majeed	0549514616	msalim@smassglobal.com	2007-05-30	male	Malijor School Junction	ghana_card	GHA-823243444-3	15.00	cash	EZCARD-1751278168401	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	completed	2025-06-30 10:09:34.005626+00	2025-06-30 10:09:34.005626+00	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QMeRXhpZgAATU0AKgAAAAgABAE7AAIAAAAYAAABSodpAAQAAAABAAABYpydAAEAAAAwAAAC5uocAAcAAAEMAAAAPgAAAAAc6gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVmVjdG9yU3RvY2suY29tLzIwNTExNDIAAAaQAAAHAAAABDAyMzGQAwACAAAAFAAAAryQBAACAAAAFAAAAtCSkQACAAAAAzAwAACSkgACAAAAAzAwAADqHAAHAAABDAAAAbAAAAAAHOoAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIwMjQ6MTA6MzEgMDc6MDU6MzQAMjAyNDoxMDozMSAwNzowNTozNAAAAFYAZQBjAHQAbwByAFMAdABvAGMAawAuAGMAbwBtAC8AMgAwADUAMQAxADQAMgAAAP/hBCZodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIi8+PHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6ZmFmNWJkZDUtYmEzZC0xMWRhLWFkMzEtZDMzZDc1MTgyZjFiIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPjx4bXA6Q3JlYXRlRGF0ZT4yMDI0LTEwLTMxVDA3OjA1OjM0PC94bXA6Q3JlYXRlRGF0ZT48L3JkZjpEZXNjcmlwdGlvbj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+PGRjOmNyZWF0b3I+PHJkZjpTZXEgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOmxpPlZlY3RvclN0b2NrLmNvbS8yMDUxMTQyPC9yZGY6bGk+PC9yZGY6U2VxPg0KCQkJPC9kYzpjcmVhdG9yPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgCCwHDAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopCQvJOBXHeO/i14Y+HdibnWdUggA6JvG4/hTSb2E2ludlSFgK+Lvid/wUI0nT7e8tfDsPnTbcRXBPGa+aNV/bU+JerTb49eWBfRV6VvGhORjKtGJ+qGv+LtJ8M2Ml3f3kUEUfXcwzXnP/DVXw8W4khbWUDxjJr8rvFnxr8V+KFkGqa3cXQY5KhyBXASeJJC29JXWQ/e3Ma2jh+7MXiH0R+0Fl+0l4Avo1dNehUN03HFXV+P3gJrlYP+Eks1lborSAE1+Kn/AAmt1GFCTOqjr85p03iuSa5juZJ3+0LwuGPSn9XXcPby7H7hw/E7wtcFQmt2jFun7wc10dvcxXUSywyLJG3IZTkGvwqXx9rkc8c8WpT8dF3cCvb/AA7+2H8QdB0W2srW+U+WAA0nNS8M+jLVbuj9a6K+LvgP+3hY6v5Gk+MB5F6+ALpB8n419c6P4u0bXreOex1G3uI3GQUcGuWUJRdmbxkpbGxRSA55HIpagsKKKKAC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	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QMeRXhpZgAATU0AKgAAAAgABAE7AAIAAAAYAAABSodpAAQAAAABAAABYpydAAEAAAAwAAAC5uocAAcAAAEMAAAAPgAAAAAc6gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVmVjdG9yU3RvY2suY29tLzIwNTExNDIAAAaQAAAHAAAABDAyMzGQAwACAAAAFAAAAryQBAACAAAAFAAAAtCSkQACAAAAAzAwAACSkgACAAAAAzAwAADqHAAHAAABDAAAAbAAAAAAHOoAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIwMjQ6MTA6MzEgMDc6MDU6MzQAMjAyNDoxMDozMSAwNzowNTozNAAAAFYAZQBjAHQAbwByAFMAdABvAGMAawAuAGMAbwBtAC8AMgAwADUAMQAxADQAMgAAAP/hBCZodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIi8+PHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6ZmFmNWJkZDUtYmEzZC0xMWRhLWFkMzEtZDMzZDc1MTgyZjFiIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPjx4bXA6Q3JlYXRlRGF0ZT4yMDI0LTEwLTMxVDA3OjA1OjM0PC94bXA6Q3JlYXRlRGF0ZT48L3JkZjpEZXNjcmlwdGlvbj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+PGRjOmNyZWF0b3I+PHJkZjpTZXEgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOmxpPlZlY3RvclN0b2NrLmNvbS8yMDUxMTQyPC9yZGY6bGk+PC9yZGY6U2VxPg0KCQkJPC9kYzpjcmVhdG9yPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgCCwHDAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopCQvJOBXHeO/i14Y+HdibnWdUggA6JvG4/hTSb2E2ludlSFgK+Lvid/wUI0nT7e8tfDsPnTbcRXBPGa+aNV/bU+JerTb49eWBfRV6VvGhORjKtGJ+qGv+LtJ8M2Ml3f3kUEUfXcwzXnP/DVXw8W4khbWUDxjJr8rvFnxr8V+KFkGqa3cXQY5KhyBXASeJJC29JXWQ/e3Ma2jh+7MXiH0R+0Fl+0l4Avo1dNehUN03HFXV+P3gJrlYP+Eks1lborSAE1+Kn/AAmt1GFCTOqjr85p03iuSa5juZJ3+0LwuGPSn9XXcPby7H7hw/E7wtcFQmt2jFun7wc10dvcxXUSywyLJG3IZTkGvwqXx9rkc8c8WpT8dF3cCvb/AA7+2H8QdB0W2srW+U+WAA0nNS8M+jLVbuj9a6K+LvgP+3hY6v5Gk+MB5F6+ALpB8n419c6P4u0bXreOex1G3uI3GQUcGuWUJRdmbxkpbGxRSA55HIpagsKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopKAFrA8ZeNtJ8CaPJqOr3cdrAoON7Abj6CvD/ANqX9q7TvgzpbWWnyR3etSDHlqwPl+5r83fit+0d4u+KzD+3NWeeyhbdFbqdqr/jXTTouer2MZVFHRH1H8av2/NYvrq40/wrElnaqTG0zn5m9xXxx4w8eaz4s1B7nWdTuLwsc7WkJA/CuS/4SD7ZPvL7o+m8+tUb/WGWb5RkV6EacY7HHKUpbmheajG/CswA7VmXGtHdhDtArGvNRmlmyjAe1U3uDI3zMM1oT0N5tadu+arSX7OwJWstJtvvQ2peX/DmgdjbaSOVRu4NTb4lAAbNc5JqnmKABg1Xa8lWUcnFBdjsobl1b5TkdqdL4lmtuD0rm7O/bzDuam6jdeacA1NyuU6y28avb/Pgn6GvQ/B37QmueHIB/ZurT2mOilsivB7dWYqN3B61KskazOq8baTVxcp+l/wG/wCCiEdlpiWPjVJLiVWCJcRDqPevsDwX8fvCHjhYvsWpRK8gBCu4zX4UaPqEvJz8o6ZNd94R8eX+j3EbQ3EqOD8ro5Fcs6Kexopyifu+jrIoZSGU8ginV8P/ALMP7ZlvPbwaD4oud0oISOcnOO2Ca+2bO8i1C1iuIHEkMihlZehFcUouDszpjJS2J6KKKgoKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooqOaZLeNpJGCIoyWY4AoAWaVII2kkYIijLMxwAK+O/wBqH9tGz8JSS+HvCV7FPqJBD3KHcqn0BHemftcftiWHhXS7vw34cuEuL2ZTFNPGc7PavzJ1jWpJriaV+WkcvuJ5ye9dlKjfWRzVKnSJs+PPHV94s1qe91O4kubuRiXeRs1wl9dKpJ3ZHpUupXStGrMcuRzWJIxkY4HFd60OXlLMdwGyBwvpUE9wdxAY02MbAcDmn/ZzINxU1VzRQKbMd+c09lhZQ+drela2naQLtsFTituHwX5jgiPclZylY09nc4nzjGPl5qVZvMT7uWr1fT/Adm0f7yAZom8D2cEm5YdvvU+0NY0jymOzkuGyI/0qeTRZ2wyo2fpXq9v4YtY8EJWlb6DbtgbKydU1VE8WtdLl875lNbP/AAisk0W4Zr1P/hE7YNlU5+lXotBSNMBKy55G6oo8QbRJ7fcCjZ7VWmtTCpG35j1Ne6P4XS5zlQPwrLv/AIfpOpwozVxnPqRKiraHj8cYZwQ5RMdM960LaZ4lyJCP7tdbe/DGUbmQHis648F3dvb52niteZ9Tk9maHh7xI9lcQ5Plcgs4PJIr9R/2WP2pvDGqeCLHS9a1aKzv4sRIszY3DpX5EN59jcASA4B7112la9beWnnOUP8AAynnNZzSmtSdYu6P30s7yG+t0nt5FlhcZV1OQRU1fDP7D/7UUV/DaeCdfu83ONtpLKeWHpnNfcoOeRyK4JR5XY6Iu6uLRRRUlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAhOBk8Cvgz9uz9p/WPDOrL4S8OXPlxNH/pUkZ+b6Aivpb9pD46ad8FvA93eSTodTkQrb2+RuY1+PHxA8d6h468TXmtXszGW4cnaT0B7V10Kd3zM5qs7e6jH1jxBJM0s0sjSzyHLM5zk1ya3L3FwXdsnsval1CQvMRnik0uwlu7xERSwJr01E50hPsT3lxznHbFbGmeFnvZBHtI98V6f4X+H8clmssqfN7iuls/CsVnJlUFachdzzKx+GL7lYkkelaTfDoL2xXqkUPlx42Co5o/MXBWspRsdEbHnun+DYbQZYfpWxa6WkXAX5a3ZLdQCCKr7QucdK5rHREgW2Ef3RVe4tHm4KjFX1O5qm8vOPWsmjVGXDpaqORirKWUca9autH0GKbJHhTxWXKaFbYg96mjYYpirS7ctVhzFu3hMnTgVoQaeHxkVXs0+WtaEjAFaxsTKWhD/ZMTfKQDVS88NxTRuuwflXQRR5AJqfyQw4rRpSMbo8a8QfDU3kUjRx8149qFpceH9Vlt5Fxs5j3dM19l21mjfKRkelcN8U/hXa6ppkl5FB+/AyCKOQydjxTwn4yvNOvLe6huHtNQhYPHNDwVI9K/Wb9i39oZ/i54LWy1i7STXLP5GBI3Oo6GvxvkW50fUTAw+ZTivVPgz8YtQ+FfjXTtUsbl4UWRfOVTwy55BrnnTuZ3tqfunRXKfDHxxb/ETwZp2t25UrcxKx2nocV1dcJsFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFY/i3xJa+EvD97qt4+yC2jLsfoK2K+cf26vFj+G/grfxxtte5/d5HoaqK5nYUnZXPzk/aW+M9/8AFjxvqFzNcs9hHKVgQnhVBrxa4YTwg547YpdSkkmuGCtlW6mqvmeTCIl+bNetGPKrI81/EZ7QyS3IRRubNer/AA38JsZEkniHrXnWnWZe6XHLZr374fxeRZqX64rop76lvQ6tbdLSAKqjpVaPJzV+5YNHnpWb5hz6V13SQJN6gVPPIqnJIVYippHLN1qpJzmuSpM64RIX/eNUTR1Y8sdc0uzc1cMpnXCJWjiDNV+O3UrnvVi1t1OMirsVuoBG3rXNKR0xgZv2dS4zTbi1ULWx9nReCnNV5rXc3tUc5tyKxhtDzmiOAM4zWjNbMH4HFOhtcMD3q+ZGPKPt7U7RitCC0fjin28R2qSvNbNrFvGCuKXPYjlKkMLFduKsxwHHNaEdmPpSNbGM5zkVpGojOUCnaqyzVuXNql3p7ITklelZ8SkSZxitiGNfszMv3q3VQxlA+Q/il4XfS9emuPLwuT2rirHYWLnlz0FfQXxrs2uotwj47nFfPtzH/Z8x2gls+lK99zCUT9MP+CdPxktZNEn8K6lfr9qU5t43bt6V92g55HSvwS+GHiafwx4nsNVsL54LmGVWbaSOM8iv20+C/jqD4hfD3StWhfzC8Shz/tAc1yVY2d0OD6HdUUUVgaBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfBv/BS7x9/Z+madoGflmHmGvvB2EalmOFAyTX5J/8ABQj4hQeNPis8Nu++DT1MPHTPeuiiryM6j0PlGTzJJTIp/dmnPsWP5OSait98zYUHAqw0LeYqlcV6vQ40tS74biIvEZhXvXhVk+yp2GK8Z8P7WvlG3IAr1nQ7oQWoGMVMZWZs46HUzzdcfdqhLcKMiqs98dvymqhuDJwTRKqbRgWJbg9BUJkNRq3zHvT9wrmlK50RiHPrViPPHFMWPd3q9bR7iMrXNJnVBCwyMuKt29wwmHel+zgVYjt1+71b1rCTOyESSSTewwKJG+UACnpDtxnmrC24yARWLZrymYe/FNVvm6Vcmt9sh9KY1qeoFGpLii7ZsGwMVt2u1VHFYtjiPgitRblVxiq1MWka8ZVx04pkgX1qmtz8vApQ5bFaRMZFhUDHirsUZbjoKrW6cjNXFkG8qvpWyZi0cL8SrCKaxRSmfWvnfxXpdvKzwQgeYe47V9VeINNXVIfJxlzXgXiD4b6raaldSRxsyMc7sdq15tDCUbHkejyJYXTQkcg4LV+oX/BN3x9PrHhfUtBdt8Nm25Dn1r8yNc099L1Bo/LIOfmbFfdf/BMPVYrHW9btWf8AeT4KjNTLWJzbSP0kooorkNQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAIL7b9jn3nCbDk+2K/Ev9qRbZvipr6WrBovtLHcD71+0PjO6+w+FdVnzjy7d2z+Br8IviVrR1rxxqczOzGS6kyf+BGuvDrVswqdDJ02NbaPJ5NPuGaab5VqFS0cioo3L6101tYxywjaPmx1ruc0kRGLZL4VsQrLI4+9xXdQuI2AHSud0TTXYIoO0Kc/Wul8sDA64rl5tTptoDSMzHrikEhWp/J2rnIP0qsynNK5aJVl+ap45Mmqf8Qq1Dk44pGquaMPOOK0rXJaqNqvK1tWsI3ZxWUrHTTTDYWq5bQDaM9afHbBnGKvLaleawdjtiU9u1sVZz8uO9Iy4fBFTLGDyKxNSu0Y6k1Czjp2qWaNpGIHSmf2fIaOcTiQRs281bjZs+tT2umuSPlrQh0w5GRin7QzcGQQsSoBFXbdNpzip1swuOKtJCqjpT5zLkI/MA7VKvzYccU7YpXpSLGVwO1bRZhJDpbUzbXUYI71V1jJtWTZzt5NaMcxRlUDitKa3huI8MvUcmrOeXY+TviJ4dRpppQNvU9K9d/4J7a5Fpnxgt7FuTOpVTmqXxW8KQrplxLGccGvMf2X/ABQ/g/41aXclioEwQH6nFXujkluft/RVXS7k3mm2055Mkat+Yq1XMUFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQBzfxHj8zwPrS5wDauP0Nfg/43t/sni+/ROQtw/8A6Ea/eD4jRGbwRrCA4LWzjP4V+FXj7Tmt/Huowhy22d/5110Ha5lNXZW0yN7hR8mTn0rutNsQkCMy4rmPDalbgI5CjNd5ChYlc5UDitZMuKJ7aJY1AUVcjj4yabbQhY8k81PD++Yj0qLlsRYdvvSNaM7egq20kcMZYnFcvq/i8WshROtaWA3RaKPvCpo1jj6tXmuoePrqF9qKTWZN451PbuETYrKR0QZ7VDdQqv3ua07G8Ru9eBWvj+8/ijbNbum/EaaPG5GzXJM74SSPfbGaPjmteMxTKEHJrxbTfiEZFHyNXWaP4yWRhng1585OLuj0I2kegS2asuKrmBI+ATmsmLxJHuBaQY+tXI9Yt5TuQ7jUe2exp7BNk7W65BzVmNowo6VlTakeewrH1LXjbqcMOOazcpSNOWMNzuI7iGPCkjdV5Li3hj3z4C+ua8VuviC0cbEcsPeuE8QfEXVLyUqt0yR+gNaRhJmE5x6H1FFqljOT5U6MB1Gag1TxBp+nqC0yqfQmvkgeOdT05hJBcO3rjNXbHxRqGvXiPemSSPuBmuiKtoccpXPpaDx1pE0nliU59e1btrfW19GPKkUj614jp6WN1CPKmW3GPm8w81oafdNod0skd/HJHnpvrqg0csk2e42sK4G4Z96tTR749qc8dRWR4X1iLVrNH8+LOORuFb6gddypEv8AED1rZyicsouJwvj/AEczaDMDyxU4FfMXwyxp/wAX9PWdCqrdr1+tfYXjWNpNBmeGLfxw1fKOm2r3Hxa0uOCPfK10vyqOc5ov2OedrH7Z+FbhLrw7p0kf3TAuPyrVrnvANvLa+EdMjmQpIIVyp+ldDWIgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAKmq2cd/ptzbzDMckbK30Ir8Sf2i9Fh8NfFbXIYCvkR3DbSp561+3d5G01rNGvDMhA/KvxR/a+8K6l4S+NWqRXQYpLKZMnuCa6KO7M5Hn3hhjqsyLCrl8+lerWnhrUooV3w7VxnOa4Lw18TtG01oLBbFjcdN6J3rf1PXZL5jIt5cxMPuxr0rSTKidH9kDMUDgyL1ArPm8RWWm+ZscGeP76ZrF86WN/MS5YMy4JzXE/2wPDOvXUt5am9EwwpJrO50KNzW8QfEuLzDG8E0Yf/AFYA61zV1qWo6ky/YrV2kbp5i11Wj39l48vYLtrEW6WPBBHWuuW4hmkIigSNU5B21fOVynnWmeEPEuoLi/tUgDfxL2qzefDK90/Eh1Virf8ALM9q9Ksbua6kyzZUf3ah1mKW7wI0JVD3FTJlRR503w+vLVQ51NdzDIUioz4X1JVPlXkRceterXFil5oK3DRKJk+XpXGXUJiLEDDCsfI01MKG18TabGWVreXHtWfJ8RNX0l2+326rg4ygrfh1ieElXjLLUt/ptrr1qPMiGfpS9nGRoqsonOTfF65Vk8mPeO4NdZonxptordTcqIZPT1ryDxNpZ07V2jiGE9KqWdi93c7WjZlz6VMqMErm1LETckj3HWPjhAsGbdPMOO1cLqnxWvrrcyqVU9q4++aPT7gR7cVY0bTX17VI4gcITzUxpR6G9ScjXsr7X9ekzBhIG/iatSLwZJ5yyXVy+7qdp4rqdFs4tLuf7PnXZB0DVZ1iMWMgSNgYT0NaciicvO+pDplhbWu2JLdbj13CuvsbS1+Um3WH2ArkrXVI4NpLrx/COtdJpnii24DwSH/gOaxlHW5SaOrs9J0e5U+fBuB64OKWfwLojAvGzRg9F3dKzF1rT5uhljb/AHTikW4+2HYkuPqag1jZmdqXhfXdHl8/SNRxD12b6Xw9408Y+bLFvyUO394eDXS6bpl2zbSjMp/irkvi9a6jpOliewmEcoPAUY5qJXZtGMLan0J8JZtb8Uaw3h7xUYbaKWAyq8R/hrtv2ZfgR4UtfjVq9/JcLqQh+a3EnO1s9q+dv2ctN8Y3/wBp1zW53ST7MY4txPTFQ+AfjZ4m+GPxAvYrMfaZzKchifWu2n8J4ldR5vdP2AVQihVGABgU6vFPgX+0ZpPxMt4NMu7iO38Q7Nz2uefrXtdSYBRRRSAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKilkZVJXtUtV7wBbeaTONqH+VAHn/AMRfjh4b+GtjI2oX6faVGRHnJ/Kvj349L4R/ai8L3+saNcQrrNihdsYDHHavmr9pz4uXVz8ZdVt3naS1jnaELnI61w+l69e+H7xrjS7yS3W4H72NDgMPeuqMbak7mH4V02TTteMUtuBcI5GWHvXsCaXCyCXyVEhHORXI6ap1HXoJyMOeT716Fyq4cYNbuzM1dM4jUtHSNnZciuJ8VaWs2nys3DL91u9ek6821TiuN1RBJayhvu4zXNJHbTl0KPgWFbPw7Pv/AHZY53dzVpdf3KVTgLxj1qlp83neHpHjHCvtxWBfak6siwRtuz6VOhpJ9jutJ8Ti3jkDEW2ejN0Fb+m6ybuP/kIQSbuK8g1hXm0eV5HKtjpXI2uoXdmy+Q77TwDzVqxz80j6F1rWrvT5fs0c8LxEZJB4rDm1KO6UqWUyf7Jrd+GPhnS9U8Kvca7P5k7L8oJ5FYHiHwbHp0Mtzplyp2nIUmueWkrHZF+7czyu5ipODUlvPPDKiwpvXPzGrOgFNWsfLuhide61fhtFjn2p91etAo3k7HmvxGjKXySxHk9RXcfCnwmusW4Z4ss3tXL+LIY7zUnQYyDxXr3wrhfT7WHaMPgCueo3a1z1aNFJ8x5r8UvA66VqG5VyfTHSuc8JWMtrq0T7GVM9cda9z+LGjSMrXewvxk1heH7Ox1bTbIwooeE/O2K444mUJcp78cuhVpOpzFOXUNPkd/tZ2EfdJFcteal580m5/wDR1+61dl4q8OrhsRl93PyiuYt9N2RcwN8vaQcV6kaikrnylam4towG1SKGQSRQNK/Tdg10+k69fmFWRkiA/hcVt/arabRDAunQJLjAcYzWRpfhK4nYtJLweQuaTkjjUZXNFfiNMI/ss9mJccl40q7Z614f8QMvkXT2t4v8DHHNT6T4Xnt4GyygtwGYZot/gfb316l4ZyspOflbFRdGvLNdT0HwrrEzRrZ3JCIOBMvNUPitp4vo9PtoBuHnKWbuea39K8MDSYYYEdWIxyeTTfEdub7WLOEYzEwJxS91bmsFKSdz2TS4UXRrGOGJYljgUMqjrxXgN9oqaf8AEq9uxGC0pJGRXv2h3CyQw4JJCgFfwrzLxVojXHjAMreWzNkVbdtTmpw5p6Hm37Muvav4f/a4jubqZlZyUSMnClSfSv2QtpDNbxyHgsoNflTp/guXRv2gPC+seV/rZEiYjvzX6qWQ22cIH9wfyqYy5icRFxlZonoooqzlCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACqGvSeVot854Cwsf0q/WJ42m+z+EdYkzjbayH/x00Afhv420lvFHxe8RucyQx3skmf8AgRqK6tZrO4LhfkHStxr5dA1bXL6Vdz3VxJtP/AjXM3njiFldHTBNb3OiEPdOv8BzLqWsKJX2so4Ar0e6UqTk1438ONRim1oSA4Br2ORlmYAdK2i9DnmrGBqVqJ8gc1hXWkbk2MPvcV191AEYYrJ1LIyVwSBnmqktAg9TkvCenx2fie80qcf6Mse8ehNSX9nYRzt5dtjafvYqjrVpJ58Op29yyNC2Zv8AaHpXRXFu99aQXkSgwyLkoO9cx17nJajDHNZyKI12n1FZUeliPS0l+zxEK+a6LVLKRrdo1GMnp6VTt9HnWzCMGb2qblKmdD4dje6hjdFxDjBWt6aytlGPJ3IevNUNDhe3s44hGw+gro7XTHePIOR6GsXvc6Iw0sc1baRD57Nbx7AetQauw0OwuJZODjiu4h02K3VnZhGo+8x4xXkPxS1z+0rtNP05vNTOGYd6q5pGnZmBoNrJr+uJKPmTdzXvmh2I0+GDaPnGOlebeBdBXT4Yjt2vjJzXrOkszbWA56VjJHpReh1N5oaeItKaEqC0i4rwPxJpuo/CvUmV4GkspX5I6DmvovRZCqqM4NZ/jzwxD4r0a4tmUPOynaWrzZRtK56lLENR5DhdNkh8TaTb3VjtLADK9al1Dw4l5GUaLBxztGK8j8M6zqfwb8UtaakkjWEr7d2MhRX0NpuoWGv2aXFjcK6MMk11RnoeTiYHk2oeA50bEW4A1n/8I1rNnIGiYsBx1r3CXT3bkjK9jVNtNRoyoX5s1pzHB7NpHmVtJrEe2O4hwo6Guo0N737Qu8EJWrdWoVwNmTTrVTu27SDnrT5iowb0N2P92RM4+VRkmuc0XUhq3jyd4jvt0XGR0pvjfXhpOki0ik33Fx8gCHJ5qx8N/DreHdPWW4+a4k+Zs+9WtWayhyRZ7Joc0a7No5NeW/HfxA3hnxVZNAdrFQxr0TQbgeYhUZFeQftUR7be3vsEyZCg1rU0icWHXvnYeEfGR8Ta/wCFJThpYbtC/wBM1+nGlyCbT7Zx/FGp/SvyB/ZwujN4gtTPk7ZFIHpzX65+FpfO8P2L+sS/yrCi9ycb8SZq0UUV0HmhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXMfEzcfAWuhfvfZJMf8AfJrp6yvFVqL3w3qUDDIkgdf0NMD8MPHc7CaWIjDRzPn/AL6NebSLJfXDIqV7f8WdFXTPFGs29wuTDO4A/E15r4dtY7q+KhcDd6VTdmd1Nc0S58P7GfS7+F5VO0tXvEMnmyBhwMV5raRx6fdZwD6Zr0HSZM26SHnIrogzlqKw/UptrY6Vz2oMJHG4nHtWnqk+6bPUVnTJ53IFamUe5mXCDdsZQYm7Y4/GuaTUNQ8H3zSWjNeae5y6yHIj9hXZSWbSRsgHDdTUNv4f3KyMu9D1BrGSsd1P3ihD4w0PU2BacxM3UEd62LW50r5WS8Ur71h3XgOC8baIxGCeqirVl8K49oH2mQCuSUkehGkzrYdc0mzjAa8jRves7WfihoGhws6y/bLgdEhNNi+FVq0Y86UygdyaRfh/4a0kmdrMGdeQxOay50zXka3OB1Hxj4k8fSNHZRNYWLcP5g2kj2q9ovhiPRcNMfOl/vNzWlqerRyTeVCqqq8LtGKn05nlAD8tWqJ5kjZ0uEW0gkfo3QV2mkjbt9OtczY2plaMP1Brr7OFl2EDipnexdNtysbunSssg54rVYGdhg4NZ9rbllUgc1t21mWVcda4ZnoyVmrGL4i8H6T4i08x6jBG4/56beRXnl58PNT8G273XhSVb7v9nkf+leral5kUMsQHykYryLxBrV74SvxPH5nlk8kk4rON+pkvfnZlJfiV4x00Y1TRlRR12jNTJ8bY1XEli2/02mtLSfipY6pKsd7HG2eoYV18Om+HNYQMlnbhm74Ap3DkTPMrz41F2CposkxPRlHSrGjeL9V8TM0NpbNaFurOK9J/4QWz3AQW6KD/AHRU9n4UeCbaLYW4H8eOtaKQ/Z8pgeF/AcEFwbi9Zrq56/McgV3LWKpGAB2qxZ6e9uuFj2Y6ue9aKWo2g4ropvU5a2qsVtHJhkVcYrh/2j9PW68NQK33g2RXoSRmGZWri/2hrWXUvCNslv8A68njFb1djzabszz79m/b/wAJAiyHLeYAfzr9cvCcfl+G9PUdPJX+VfkZ8P7GT4d2dnc3AJvLiRcDvyRX63+CZDN4S0mRhhmtkJ/IVjSVjLFS5mjbooorc4AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAqK4hW4gkjb7rKQalpGXcpB6HigD8bv2mNPTS/jR4p08jIacmMnvXgf2TVNH1B5o428nOeK+vP+Civw5ufDfxKh1i0ikFtcpuMqj+L0Jr528Oaw9zpU0V1CGO3AJroUb6m0altDHXxB9shHO2XvXqegagJdJi5yVXk15PcaDE0xmWbyz1212vhG+H9lyKAXK1exE3zM6GedZmJJzT0kjWMZrDiugyk5+YnpUhuAoALc1LkXTjc24XVqtxt8pxXOLqAjB2sM1Ys9QkMiqSMNXPUmenRgjpLK33sCcVrtiGPjFc/FdLDxvxTLzVnSMndgVwyd2elGyNHUteNpGVBFcF4p8Rs0TKGwW9KqeINeZptoeuL1TUJZr2IHLLnk1UY9TKU1sdf4f0ea+YTNznmuysdJ8uRdwxWX4Z1y3tLWNPlLYqzq3iYKQyV0p2OfRs7K3tY4ipFb2m7JJAGPFeSQ+OvLYBmrqdH8VLMgYMK5qtR2O6lFN6Hs+j2tvJgFgDXSR6LGI9yOK8Ft/Gs1vcfK54966L/AIWRc+QArkcc815ntHc9H2eh6jLosc6vuYE+ma4vxh4Jj1XS7iJowcKSK5qH4mNDdL5k/wCBNXLr4sRsxhjIkLDHFa87OeVJo+ZPEdnJ4b1KRZdysrcfnW94b+IEzKkfmEbfet/4ieH28QGW9CYPXpXis0d1pd2x2soU12xSkjz+ZwZ9X+G/H83kR5O7HFeh6f4oS6hVpMGvkDw340mjCIzECvTdD8ZSSFVEny/WuCpFp3PRjUjONj6DXVkuhgHj0qWO6C4GcivLrHxR5MQw/NaFt4sLNy1XGbOapT0Z6HNeIF6c1jeMHjurG1eQb/LOQKxbfxEJmwTmnazfNL5MKfNv7V6EZ3Wp5TjZkGk6I3jT4meHbcw5tkZWKgccGv0+0e2FnpVpAowI4lUD6CvjH9m3wnFqnjS3uXjGYFzyK+2VXaoA6AVtE86s7yFoooqjAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPnv9tL4anx38K7mW3gV7qzPmbsZO0da/NCx8NxWNpPI+C3TbX7V6hYQapZy2tygkglUqyt0INfB37SP7IetabqkureC7Nr+C4JLWMYxt+ldFOS2ZD3ufEdxaosjyunydMUmh3Tx3E6whcY+7XX6t8FfirHctbHwVqHzHGRHkL712Nj+xP4+8N+E7nxjqk8cESx+Y1oQQwHvWkmijyJbvy9z9JPSori62Lv35ZutVdRuBHcliMDODisjULzap2twawZ0U2aDagwY4ep4tUk28Pg1yv2w7SQ1Ot9QPPPFcskejCdjt7fWZQoDPn6mi+15/JIZsiuQk1qKOPG75qoNq01xkHlahRNfbGzNfC8kPHFPa1EsOF+9VPT2Xjd3rXhVRyDWpFm9TnrzUrzR0ygZ+e1ZUnxCuY22yI1dZqEcckZ3NiuL1KwRpThgfwquVszbcSCbxx5jZIYVtaH8SY7W4H71iMdK5S403Lccnp0rQ07wn8yt5LZb2qJU1bUdOtNPQ76z8a3WpXUZgDYJ5xXT6lrV61ntTML461ieG9Ni0uHc8WCB3Fb326G/tZFMZ3dsDNcLhG56KxFSxhaXpWp6ldCSXUAVz93NeteF/CkEQSVy0kuOT1rze1tXsrcOEfO7PQ10GmeN9Rs5PLit3YY9DRKMbDjiJt6o9N1PS4prN1C4yK8S8e+GyqsVjwPau7TxtdzcTQMgPqKTUJYNWtTvTJrOEnF2ZdaKkro+b5b42dyYs7GHaus8N6+6yIjPgnpzVH4keDjHK13bBgRycVxmk3Esky/OQ0fHWvSVNTR5SqSpysfQGna87RndwR3rasNYZhktxXlug3U09uGLnHSuz0pX8oE81ySppM7PbuSO/0fUjJcKuetemaf8O/Fvi+a2bw5Yfaztxubhc/WvGNDZ/t0a5PWv0y/ZQ0prP4awSSxqHZshsc1vCKPOr1GjM/Zj+EfiLwPZyXnihI4tQk4EcRyAK+gKKK3PObuFFFFMQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADfLTOdq5+lcf8YNPGp/DfXbbZvMls4Cj1xXZVDeQJc2ssTqGVlIIP0oA/CvxdpdxpOrXdvOhQRyMMEdOa46+fr6V9DftR+D5vDfxN1u3kXbHJOZIhjHyk18+aku1ioFaM3p7GHJcFWNR/aiCQDT5I/mNVpI8VJqh9tCbqUsTkCrLXyK3kpw1SWEJSM471mXdq1ndeeRkUFG/ayOy/M2CKsrfuF25JP8As1y6+Jbdm2yt5eDitSHxNp9rGCCJGo0NIy6Jm1b2d1eMODtb1q1D4LeRjJKcJWZD46AVI4YCzN0xVlNe1y6yiWsmz6VnKfKdSpuRrw+E9PjUPJMAc8V2GhabpkbRiaRSBXnCXer3wNuLOQsO+2pWuNUsTEjW8wOecqaxlVcjpp0XF/Ce4T6Lo91a/IyjNLptjpWm4jjRXJ6kjNeZaTrOpzbLZLR2ZjjvXqdr8MPE9xpcF5FYyKr4ya4JTSZ6Hs5W2N2PWNMiVYntYSB3K1HN4s0C3kGLa33d8Yqt/wAKL8WatPAY3MUUnB3DpXNeJf2e9Y8J6yovbkzWkg3P5Z5FEZxYKjJrVG7q2taXfQmRI4kX2Irj7zxbpFmGPnJx1Ga474kaTaaZZtBpFzcvddCgJNeY6D8NPFniG7LTCVIWPfIroUYydzjqc1NWO08TePrS5mnjg/fq3HHauH0PTxcXE8wBAZulddrXgOLwxaRxkfvyPmNR+HNN8kNx96utWitDypXkzY8L2Yj+XqK9C0+3C269jXLaPZ+W6HHQ111vKqNg9WrnlLU2po1/Clr9q8Q2cQGS0qr+tfrJ8LdB/wCEd8F6fbYxmNW/MV+af7PPhceKPiVptsylljlEhwPQ1+qlnEILWGMDARAo/AVtT7nFin71iaiiitjiCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD4i/wCCg3wffUrG38W2UeZIh5cqqO3qa/N7VLYxyurfeHWv3M+Lnhm18WeAdXsbqIShoGKj/axxX4n+PdHl0PX9QtJFKtFKy8/WqvoXF9Dh3h+Y9qhe3FWXYc5qvId2MGlc3iLbyGOQDtWo1nHqEWGFZAYbhWnY3Hl44p3NUZGrfDyO9UmNirVzI8D6hY3igIZI89a9Yt7gMwPUVoI0EmCU+b6VDZ0QpQTuRfD3wXBctBJKgG0gNmvodvh9BaWtq0USnzAOwrxjQ7hY5lCsY1BzgV7Bofi2WaG3Z5S6RYwCa5Klz1aUuTY6Wx+HraNdQO9iuZuhZBXdap8FVn0F9QksodwGQNlUofitb3traiaHcYehr0bSfjhpN9o72d1EFfyyq5+lcT5kdLxEk7JHi3gf4b/2x4qjjgtYj5Z5wK+itW8LanpdrY2iwhIJML8teafCDW7bR/FN7eyECKRiV3V6d4t+L0BREtU3yp0z0rllFyZ0OvJl7XvBd1psGn+TJiMrlzxxXiXxW1yyW+NrE6zTBCpPpW14q+J3ibxJEltGPLj6bl6iuDm8OrDMbm6Yy3DdQ1VGk9xwnJ7s8zsfBNlFdzXtxD5rucjIzWu9rb2Ni8gjWNQOAoxW5rBjtxhBgelcj4gvt1sVDcEV1wucldxZ5D43/wCJlqTNn5VNYtnGEbC9q2tdB8xyeTmsuxjwxIro1PLdrmrpsxhbnmuihZJCkh7Vz1swj7ZrufAfg6+8b6vaaZZRNJJM4B2jOB61NtRtqKufWn7C3gH7RrF34gmhzCF2xsRxmvuKuF+C/wAObb4Y+BbDSYVxIqBpG9WI5ru67oqyPEqT55NhRRRVGQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAQX0ayWcysMqUOR+FfjJ+0lZI3xS8SCBPlW4YYUdK/Z6Zd0Mg9VP8AKvyF/aWsU0v4s+Iwp4knLU0NbnzJffu2IPBz0qg02361u+JLVVZplFcwZN3J61XKdEWWFk2nJNTpdbiMVnyMPWnQybeM0cpqpHS2N8I1+ateC+BXIGa5CGXkZOa1LW62nGcCsuU1jY6uz1VCcEEPXT6XrzW6qiMTjrXni3K43A/N61NDq0tuxIbjvUOx306ltj3Cz8bW7W6QjbvHU10Ok6/a3yfNhXXpzXzpF4gSFyN3J5NdDovi6OOVWMm3HvWMopnZGpGXxH1L4a1C1khUySCPYcnmtxtVs3uN4nDR+lfO9n44VlBWZR6jNaS+Mo0XL3CqPZq4px7HVaElufQ3/CQWFvDuXG7Fchr3iI3EhcMu3tivKv8AhZFuy+SkvmE8datWupSX67gSBUKTRLpqKupGzqmpGZuTXG+I9SWOMgHmtfUGdY8jrXE6zHJIxJ6VtG5wVJXOev5PtWf51Whbyzirs1uQrECoIbUyfMeBXVE5GTWMbTXaLgnccBfU1+kP7FPwFHhfQ18VarCV1C7X93FIv3F7V8+fsb/s7z/EPxPHrmr2X/EhtSHidh/rHFfpfaWsVjbRwQoI4o1CqqjAAFbRjrdnnVql/dRLS0UVqcgUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAEc/+pk/3TX5M/tdQfZfidqZI5kcmv1okXchHqK/K39ta1EPxhvomXCqmR9auIj5U1J49zRv+tchqFvtlJQfLXSa3kXTOx5HSsKaYMp4qzWLMnndg1LH1FPeMdRSRqeuOlIu5ah5NaFvG3aq9nH5mOxrZs4M4xWbOiLGKMKBUjxgoea1YbBZVXPWnXGjySYEeKxkdUWc3JpcsnzoeagfS71OVY/hXbWmiv5YD8fStuw0BHxu5FZOSN1Hmdzyv/iZw8b2/Ouq0Hw/f6jGPNmfB969ItfCNlKo3oM102leGLW1K7Ys/SsJNHTGHmcR4b8CvDcB3Zm5716bZWPkxqgXHatS1sYIUGECmrXlqrA4FYSsXyszptNEi9O1cvrGj7WZtvSvQGwVxXPawRz6VrFaHLPc83msdrszD5PStPwj4NbxBr1pEv8AqpJVUj6mrFwizSFW6V6B8KbNLfxFp24hYzMuT+Nbw3Oaoz9KvhL4MsvA3gXTNNsoxHGsSk4HUkV2VUNBdJNHszGdyeUuCPpV+uw8cKKKKBBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUU2SRYkZ3YKqjJJPAoAzfE2tReHdAv9SmYLHbQtISfYZr8hPjb8R2+KPinUtdxhHkZEPsDX19+3h+1Tpng/wHqPhrQbuO61W6Ty5GjbKqp4PPrX576PdnUPCNsR99gWauiEHa5N9TkdUi82RiTnmudvo+pUcV0t8uJGCnPPNY11GORjig6EtDESXbkGnRSBpMZp91bhV461R5TnvWbHY3bVhnFbNrc+X1rkrW8ZSM1rw3wx1qGaRZ1tndjg54NasF0jY5rhV1Pyx14qeHXipHNYs64s9Ls7mFhzjFaNvqEKsAprzS21/qN2K0Ida2kHdXPKLudkJQS1Z6V/aijBBrZ03XpAwFeWQa8GI+b9a1bbxIVYHdWMos6oyh3PXodU83BYfrWgdQjOMivIE8aupChqur4ull281CjqTOUbaM9OuNWijjJzg/WuO1TX98m0Z5rHuPEDNHjdk0mmwyajcLlePWum1kcLd2a+jWJkdp3+Zfeu48PxmFlmViu05GO1Y9haiOER4rpdFtN2I+gojuRNaHu/7G37Tl14h8bax4G169E0kLZsi2M7fSvtivwf13xPrnwP+P8AbeIED2x84NE3Tcmea/Zr4D/F/SfjN8P9O1zTblZ2aMCYA8q+ORXoSjZJnjdWj0eiiioAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKzPEniKw8J6Nc6pqdwttZ26l5JHOABQBZ1LUrbSbOW6u5lggjUszOcAAV+dv7Vf7cmpapeX3hjwXdrbWakxzXqfeYdwDXDftdftpXHxL1SbRvCt5LbaDDlJJEODKfb2r44n1CS5kzvO/dn6130aH2pHPKfRGn441+XVrBzPM88jHczSMSc+uaueAdUF5oLRFsmMYFcv4gkM1mo27Tj5sd6qfDzVvJ1B7IHAbmt6vuoVPVnYX0YWR+cmseVTtNbuoQjzj6VlXCgZAFed1PWS0MeaMY5qnJCD2rTmj6mqbR9aGKxnvCV6VG1w8PAq8Vz2qKaPd2oIcSv/aAXGTzT11ANwOtVbm3281WWTyzTsiLtGxDqHl5JNWY9b981z00izD72MU23CrnLfrUuCLVW2h1UOvFc84rQt9d3R8NiuNWQbx83FTRyN5nyZxWbii1UbOvg14LJ87VtQeIgyrtauN0vTpb24XKnFeheGfAcl9fIWU7Pes5KKRtGUpaI1dF0q81plbLKntXqPh/Sv7NgVS29/erWh6EmlWqRxpk49K11twi5YYauWb7HVCPciUBZQAMVu6XIY2DdsisVV3TZFaf2j7HZyueyE/pU05a6mlSOmhX/AGy/A+meKPhTp/iW2hU39igTzEH8688/Yn/agvvgx4gjtbp2m0W4IWaHPyp7gV7j8C1tvjV8NfE/hu/IlC+Y0ZJ/iAOBXwZfaHeeAfHN9pV0CjW9w21W9M8V7cbSVmeBUVpaH9Avg/xdp3jbQbXVdMnWe2uEDgqckZ7Vt1+Q3wP/AGpfFHwmEcNncfabGYj/AEeQ5Cj2r9CPgz+1N4c+KEcNpM40/Vdo3RykAMfasZU3EhSue40UisGUFTkHoRS1kUFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRVLVtasdDs3ur+6jtYEGTJKwAFfMHxm/b48F+B4bnTtDuDqmtDITyxmMe5amk3ogPqHU9UtdHsZru8nS3t4VLvJIcAAV+XX7bH7Z03xGvLzwZ4dLJoUblJ7hTxNj0PpXnHxm/bL8efEmF9OmvfsdnMCHjgJAI9DXzZcXE95vXdgqck561208O73kYSn0RYWT92Ruz6VTMwWU80puBIuQMDpVIuPMOTXcrpGK1LN7N5tuy5rmLW6ax1mJo/lIblhW9c/NGcVjSQg3KEDLE8VjU1RrDSVj1RJ/t9vHJ7c1VmjyzYqhoeokW4gbggYrVXDZry3oz2Yq6MuSL5ueRVKeP0GBW1JHuOQKqSQBieKz5zZQMryweTS+Sv41ZlhwSKRYx9KpSIcChPbiQDjms+azXkYrfaIYqjNCCxq1JGLpmBNpoY+lOt9JB45rYktwcVZs4V3CpdQqNFMhsfDSy4ODXS6f4TjODsrU0O2jcoOM11FrZhe2K5JVGdkMOhPC/huEMBsGfpXpuj6alkqkKAa5fR5Ft8HGMV0EOqA454rknUcjrjRUDrIbpY1z1qO4mD/NnHtWNDqChetSvehl65p82hcaepoQSBclqzPG3iEaf4fumBx+7YfpTGvDKwA4ArzX4za99n8P3EQblgR1qY3b0CouVHr/APwT58QNJrFxC7fJLcEsT3Ga4P8Ab8+G8/hH4vya5HGY7a+IKADg1b/YJu2juuuCr7s19Sf8FAPAsfib4M23iVUDPp6D5gOelfQUj5erufAVrMzWNpNA2GUDcfSuuh8T3mkx29/a3b291GQVaNsHNcP4LZZ9HGTksuSK1LgbtMK9WBruUU0c59vfs5ft/wAtnJaaB44YSqxEcV4vYf7Vfdvh/wAcaF4os47nTNTt7qOQAjy5Aa/AyS5MDHcTz1Ndr4L+Mnib4ZssulaxNEmQwjLkr+Vc88Ot0KMmtz926Wvzj+Bf/BS0Wht9O8cr5xchBdRdvc193+B/il4b+IWnw3Wjapb3QkUNsVwWH4VxSi47mqkmdbRRRUFBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRVbUNRttLtZLm7mSCCMZZ5DgCvmT47ft0eEvhvava6NcR6vqLAqPKbIQ+9VGLlokK6W59F+KfF2keC9Km1HWL6GxtIhuZ5WA4r4/+Kn/AAUo8N6DNcWnhezk1YjKrdHhM+or4k+NH7TnjD4uXDrqeosLQE+XAhwmPf1rxaS6mkzkgV208M95GMqnY9x+Mf7WXjH4t3Uq3WoTWmnvx9kjkIWvGZNQ81cMxPuayJJN2ctUDXhXKAV2pRirJGC5m9S3qV4GXbn6Vk+YrP8AeNOmy/U1B5ew0XZrYu7wVz0qnIBuJ71IGJUVG67mpBaxIpG05P0qkrC3uopGTcEbJX1q4ke7r2qC5UM/61Eth9bnYatoL6E1jfeb5kd6m8KP4KnjuPlUr86t/EOlb+n2v/CZfCe4liG7UbNtqqOoUd64/SrhvsohT/VLwx968uorHq4aTlubBXDBc5z3qKSMhiKdblFIGfl9aseTuznp2rkfc9LUznhz25qNo8cY5rT+ynOaZJa+3NK4rGNMjK3TioZI/lz3rUltju5qJrf1FO4uVmO2ehFOVjHyKvyWobr1qtLamPkVejMrNM1dF1RredSa7iy1JpIwa8uVngbI610Wh6lLuAbp2rGcTppyZ6Xb3DNCO1X4JjtFc9psjyqOeK6CzjZsZHFckrHck5F2K4bpn9a1LPJ+9yKqRwpGM4pZrzylG3gDrXO3fY6YJJalu6vYrRWOegr55+LXiE30cybuATXp/ibxAsMEm1vmxivnnxvftcPMBzuNd9CB5uJqJH0/+wv5kF6ZGBETmv0f8deGbf4g/A/WdFnw6tAzgdegr4Q/ZP8AD76T4RsZwnMqhi3cV97eFZzd+EdQjVv+XNx+le5FHzc3c/IXR7U6PrepWHRIZ2jUfQ1rnC+YG6VF42tW0v4lanBtxuuXJ/OnXbHznXHy/wB6uhMxZzV8q/aCCuR6VUkCTRtHLHj+7WlfIrsWU5IrLuP3nLcMOlXczRkTafGrFXyr/wAPNdN8PfjN4x+E+qJdeHdYe1dGB8uRiVP4ZrnL6GS4+dW/eL0FZ9ypuo+Y8OvVqylFSJ6n6ZfAn/gpva3Vvaaf43s5DdthGurdflz619ueCfi34W8f2kU2kavbXDSDPlCQbh+Ffz36TqUlrN5e/K+len+AfiJrPhDVItS0PU5rO9hOV+c7T9RmsHQvsbKR++VLX5pfCn/gpVq/hiFLXx3atqK5AFxap0HvX1z8M/2yPhz8TfJSz1ZLSeTGEuSE59Oa5pQlHcrmR7pRVSz1ax1Bc2t3DcD/AKZSBv5VbrMoKKKKACiiigAooooAKKKKACiiigAoorhviP8AGbwr8LdNe713VIbcDogYFj+FNJvYDuCcda8n+Nn7SHhT4L+H577UL2O4ul+VLWFgXLfSviv44f8ABRXVdbup7DwdE1lZqSv24n7w9hXxn4q8eav4t1Ke71C7lvppX3O0jEj8q6oYeUviMZVF0PdPjx+2P4v+LNxJAl9LpWjE4W2gbG8dt1fOl9qHnMzMS5Y5JY5qnNMzMxzkY/Kq3nLt5NelGKp6I5pSbEuLksvXj0qo102Msc06WYHIxxUE2PLzT5wSDcpbdilaRT0qurjbik5XnNRubJBNN83FRqzN701sk0qKdtAyVX45p1R0pagCRWy4HaoZFyzk0qmnN81TLYaO++BniZPD/jFLa6+aw1EfZth6Bjxmt74pfDWX4eeJngj5sJj5ocdOea8ntZ3s5oriI7ZYmDI3oa+wNc0Gf4w/AjT9VtF87UdLQG52jLScV5tWJ3UZcrPnCONGGFPydjVlXbv2pYbN7eQRTRtFL/cbjFOeORThl5rzpJo9qLurlm3dW4NTPbrtyBzVKBjG4yK17dg4HGai5ojKkt/UVA9rx0xW5cQdwtVXjBHNLmNNDH+xFu1MlsT6VqKBmpUhVznNHOyHBMxY9J8xuVre0vQ1VlO2rdvCoYccVs2cYOMDFRKZpCnY19J0tY0U47Vvw2qCPI61l2cm1R2q5JebFIHXFcrkdkY2QlwxTPtWLqmqLDEy55xVy4vAY23VwviK+VZmwcLilGN2Ddkc74k1BpS+G4rzG4T7TrcEbchnHH412eqTGUMRWL4X00ap40sYyCy7smvXoxPBxUj79/Z30508NWKquYlQcV9e/DOFZmW3PEc3yMD6V81fs82f9n2CRvyuAAtfRui3Q0HF87CGGM7vmOK9SOx45+bf7X/hI+Dv2gtXCq0VpK37s4wOa85v2cRxKjZyOTX1j+3zq3hPxcthqNjPHJqKf6zyzzmvkhD5lnGV67auL1M2Z8wEasn8XXNZc3Oa0LrduJPWsuZ8MecVuzMrMw306W3Tyzt6nrTVUuTViFdqlW69qhoDkbyNrW5LKO9X9L1BlkBBx61Z1OxChmZawIg9vMcnHNLYDv4dX3BVbBFXvJSZd8UzxP8A9MmKn9K5WyfzIxzzV2O+eCQHOAO9VdMD134V/H3xr8I7onSdVuJISfmjuJGcfqa+wvhj/wAFJJpJoIvE9lmAAB2hX5vrX56wapHdIQZAWpYXeNWKkms5U4y6Duz9uPhx+054C+J6ouk6vGs7dYZyEYH0r1WORJlDIyup6FTkV+AmjeJrnR5lltZ5ra4U58yNiDX1R8Ef27vFvgqS1sNUlTUNLXhml5cD61zSw8l8Jan3P1Worxv4S/tReDvilHHDbX8dvfEcwysBzXsUciyKGRgynoQc1zNNbmg6iiikAUUUUAFYHirx5oPgm1NxrWqW9hH2MzgZr5u+O37degeBbe4s/DWzV9TTKNz8qn1zX54fFH40+Jfipey3GsalLPC8hZLct8iewrpp4ec9TOU0tj7a/aH/AOCg1toltLpngZUub3O1rqTlAPUV8CeOviRr/j7UpdQ1nUZruWQ7jGzEoPoK5e6Zt3zPkVSuLoAYB5r0o0oU9jmc3LcS5mOeOP8AZHSqzsAhw2z6UkkpINV2XdnLVo5XIUEJ5hj4B3ButQs3txTZJlj71nT3Ts3y9Khy6GlizNcJH3yaoXFw8mOMCpPL3DLVFM2AF7VDVykOjViAas4LKBRbKGSpRHtzS2KKzfKaVZFWh6jZRVXE3YkLdcUnemc05cimCdxcGlDZprMcU1etBSLUcYkYITtVu9fav7AviqCSTUdBviJI5PlVG53CviiP94wU8e9en/AvxxL4H8dWGoK5RVcIVHQjPWuWpEtN3Pqn9rL9ndPD8g8S6NBttZG+eNR+tfMD2o78npX6k/6J8WPhyYlxcRzwcE9mIr8+fib8OL34f6/cWVxCwVnJiOPvc15tem4xue/hakZe6zyy4hO/irVnlCAau3tn5G3I+Y9R6VV2bZBjkeorzFNS2PU9n1NER+YvFU7uAqOK0bHEkeAKlubNmjzipbEo32OZlUr9aiinKtWrNann5azZrUq2QK0ujPUt295+VbFrqCoorm4I3VuRxWpDAWAxUNXNonSQahvAxzV2GYyZrEsYSuCa0rabaxz0qHE2T0ItSuDDG30rz7WGe7f5W4U5IrsNautwauDvplt5mffyeq1vSgclSRlahGbiYpAjNJJwFFeofAv4Q39vrCanf2525+UMtXf2cfh3N4u8WDUbu1Z9OtzklhxX2BYeHYZtUAtYljtI+AAK9qnDQ+fxE7yL/wAO9HXR2UlyH6ha47/goR8XtW+Hnw48N2uiEwXOoHbKy8HFeq+HdPU60iEEE8KK+Sf+Cl/itb7UPDmjxsDJbH5gD0rptocZ8oW/iHVtdvle+u3kOckOxNdvA261VQc15xowRply5z3r0C3kWHT0Kck1MdyGRXTZYj0rFuj89alwHXLv/FWRN/rDXQ3YzCPIq1GBwT1qGFeRV5kCx8Co5gKF/btMuTytcvqcH74MOAK7NpA0LLXM6xARG2OtTcaI9JmwwBPFbLFWXgZrl9NkKPg10du2Y6SGRsvkNuXr6VpWF+dnJwarPb+cnBxVGTdbt1NVzAdAzblz/FUa3Ulu33jWfb6iGCgmrjsJFBFaRn3Isb2i+KL/AEu4juLS6mt5kOVaNyDmvsr9nH9vbWPCt1a6R4vf7XpfC/aCcstfCyyGMjFbNrJ5sWR94U504zRV7H70eC/HGleO9Hg1LSrlJ4ZV3ABgSK6Cvxj/AGff2jvEfwh8QQSQ3rzafuAlt5HJXb3wK/U34M/H7w18ZtMWbSrlRcqo8yBj8wPfivMqUnTNYy5j0+ikorEo/A/Ur5p5GZ2YyHksT1rGubx24QAY61TvdXi3EGXn0qj/AGuvKhC3+1X0ftFFWRwRuWppXkYZJxVaeaOHksCaoXN9dSNtVfkqFbNfvs7M/oTXO5F8pNNqe9isYytQ+ZK30p+0L/Dg0M1QpDsQeSHbLNSNtXOOtPOKgP3s0N6jGliTz0qvcMNwqeX7vvVOTBPNMaNK14SrBYkVWs/+PdWPWrJXHeobGQGPJzTWULVjG0VBJ8zUJg0R7aNtSGm1aJ2GNxTB1p71F3qkWWFYdzgVr6VdCHYUB3Kcg1i88DbuHpWrZN+8UL8mawnuO9j9P/2MvH8et+BYNPMoM8HLAnmuv/aa+E8XjTwudTs4gdQt1yu0cnivib9kvxpeeHPHltYLMWhuzhsHpX6b6M0erWLQORICMY9qzlDng0dNCt7OR+UmqaRPbXEsVwhSVThgRWAsBgyhGRnrX1R+1V8M10HxYbyxhKW0gy2BxmvnS+0/yxyK+alT9nJn19GSqwF0u1DRj5a0mtQYzlaraSw+70rp1sxJbg4rmlLU3jFxZx1xagg4SsuazO77uPwru5bH5Tlayp7Pk/J+lUuUfsjkGtzu+7irMUYjFas1qS33efpVZrRv7tXzdjNxcSH7Rt6dasNI7RhRwTTfsueg5qYwtHGXI4A61cZXViPMwNYl8uEk9qj+F/w/n+K/iyKwRWS1V/3kijoKz9Z8/VL+CygBZ5m2gCvt/wDZ6+EsHgHwml40H+l3a7nbHIr1cLR1ueNjKySsjd8P+CbD4e+HY9N0yNcqArkDl/euj0yzW1scKuZG5xUotft14pXop+YGth4Y4Sz5VLWNcvIxwBXu2jGJ89dyZT1bWrP4c+DdQ8XavIo+xxl44W6scV+Tnxu+K1x8YvHl5rjsfs7SExx+gr379t39o5/Fk0fhLQp91panZcMh4evkO3VDt8pduOCK4pu+xqb+jgIQQOtd9aYawVSMYrhNKHzLXc2shFqPpTp3W5EireMyd931rNZTI5PStK7bdVBV+atHqySRPlwKkwxPJ4pyqNucUxmxUMdhsh9Ky9Q+bgjOelaDGoLmLzIyB949KQHILuhvTu+6DzXVRW5NupB6jNc1qSmO7jbB2rw1dHpdwZocE84pjJbdtjbWODVTVIz1Bp10xjkzU6st1Dg9cUWAwreQpLye9dBbyhoxzmuYvo3gZu3NWdJum3DLVQjp/wCH0qxZzGNtpNU4ZDIATVlfvCndisXPPMUykN3r0D4b/FzXPhR4ktdX0S5eJlcb48nawzzkV5ndNjB9Ku284lhUZya00krMF7p+1Hw//aO0DxL4L0fU7q9iS5ubdXkXPRuh/lRX4+6f481jSrOK0t7uSOGMYVQTxzn+tFcPsGacyPPVsWXmRVamnyvug4P92pmLN3NQSN8p459a7pGXL2FaR1XA6VAMBsg807a3944pGAXoOaxbAacsc01qkb5QD1JpNpakmBWkzUJyKtMvamMob61dxMqsc1SmOGNaLKB1qhcr1botWCNOzB+yoTU4OaZa82cRHTFSKp9KzkUhG5FRsvNTU1l4zUosi4ptP200rWyMpEbU0Y3VIyHFRkEVcRXJR83Q4qe3fDoSeM1VibdkE4p6/dwKymUenfC/xd/wi/iq1veysOa/Rj4Z/tGaNOtr5Q89/LBcA1+WelzAxj1Fe0fAjxV/wj+uebP+9tzwd1TF9ClBvU/Q7x8un/Gjw/cpaRrFcRrkKw5r4/8AEnw3u9Hmlt7m1kG0n5scV9I/DPxdZXmqWk1owijm++texapo+g6szQ3+niVZOjgVwYrDNs9fDYz2WjPzTn0GfT7jMeGXPSun0ePzocNw2K+wvFX7MvhvWo3k0jbbztyAxrwrxb8D/EXgu4d/sz3cC/8APFc8V5VXCNRue9Tx0JWPO/soRtpG6ql5pf8AEF4rqVtJFIE9rLbt/wBNVxT300gb/lZfY15UqconoxrxkefXFiN+QmKqzWvy5C4/Cu7vtPRhuC4zWZNp6qhyM04S11HKzOO+yovOOe9Udaka309gi/uSPvd8108lmsc3TOe1SaL4JuvG3iqy0q3UtCzgTY7Cu6jFymrHnYiahEqfs6/CO78eeM7fU51eO1sn3jI4evuTVGGnWaxxEQpGNu2rHhXwLp/w38Ow2VhCqyqvLY5NYWtXzSXASYZQtk19dSp8kT4uvUc5DtNYbZrts7EGW9xXyj+1X+05eWenT+G/DxNqkwKTPn5vwr7V8QT6Xp/wxvru3VTN5J5H0r8k/jJfHU/FU7k5Jc9/esakm3YI6I80uUluGMju0jNy8jfeJptnCbhvlUKR6d607WEO7Iams7EwTEkcVMdCrk2nweWy7q663w1rkdK5+whFvcGRfmPo3SughuI3mUn5Rj7o6VVyWVZs81AoAq1MhUkHkZqr/FRcQokO7HalZM9qXy/SpVX5cUgKcny1D/CT37VbmUZIqoY898U7AYuqWoMTE9Dzmk0a4b+laF9CfLK4zWTaK1rc88Kx4pAbF8u6PNU7eby+BWjKomhz0GKxW+SbB6VQBq0e+PIPNZljKYptpNalzhoyM1if6u4GD3pgdhYTBlGa1IyGwc8Vz+my7lANbcbbVHNAFiSHepqK1YxyH2q3bkSD14qq0JhmPcGlezDoXPth9KKiXG0Z60VtoZcxRjUMtRyw+o4qK1Y+tXG5Xms2adCi0e3rUTVZkqu1ZkkZYsRS7tq0gpGoAZmo2PFS1G3eqQFeRsVSupN0TCrUtZ9x0NaXA27Ft1ig9Ks7uBVHSebX8auN92oAN340qt7UxafQA0nNMZaf/FQ1AFbnJpGzUh601q1RBEB1qRMqOKOxoqZFI0NLkIbb2Nei+ALgJqEkMx/c4/d465rzO1JCkjrXaeD3b7fZnPJas46am0W9j6u8C69PYWcHknbJGRivtLwe6eKvDFpOZMSrGAzD1r4W0E7VhxxX2b+zXK8vhRg7bhu71U23uLlTZ0f2G5s5GCliB0erlp4gkt8xXcazL23Lmuv1i3jWzBCAHFcPrUarswMcVHxLU1i3HYqa94N8L+N1K3Vqsch6MgArhNT/AGVmuWLaLcIA3IWRq62GRllGCRzXZeH7iTA+dvzrjlhoS3OuOMqR2PkLx98J9e8D3Riv7YyKejwrla4C7sWjyhHzf3a/SnUtPttX0vZeQR3C7f8Aloua+M/jX4Z0vR9Yneys0t2JPKk/415lXCQjserQxc56M8Gvljs4neQdO/pX0L+yH4Aa5mutWuYMxzD91Iw+9XztrzF49rchjg1+gv7MVjBD8K9PZIlVgnBrqwtNQipGGMrOTsXde8Ov5MmBhx92vKPEWmzQ7kdeWON1fROqKGt2YjJ9a8u8VQRvwUBr6CNTmjY+ccbSueM+OfEg8O/DHXIpW4SM4LH2r8v9e1B9U1i6uH6MxK/nX6JftbH7D8L7wQfugy/Nt71+bDSs0YJbmuS/vG3Qt2dqN2/qau+WQ3NV9NYt1rQkqNwQkK9Kuqu1c96qRdquAkIMU0AsT7iQTmmSLtak3FWOOKfP/qxTJHr93NNjYuxpYv8AV02E4Y4pgMmjJc1TuI2hI5rRf/WVFeKOOKoCvDCs65as/VbMKUdRwDWxbAelR6so+xucUmBUgdWtfes29hCqTV6z/wCPcfWotUAWNcetIDEeQ4x0rOP+urQuBWef9dVAbmnHpW2p+UViad9wVtR/doAnt5zGw5rQX94pbrWUav2LHaRnihrS4dCJpCGIwaKWT/WN9aKz5jI//9k=	\N	active	2025-06-30	2025-07-11	GD-206-2429	Adenta Municipal	Accra Ghana	00233	\N	\N	\N
\.


--
-- Data for Name: e_zwich_partner_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.e_zwich_partner_accounts (id, branch_id, bank_name, account_number, account_name, contact_person, contact_phone, contact_email, settlement_time, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: e_zwich_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.e_zwich_transactions (id, transaction_type, amount, fee, customer_name, customer_phone, card_number, reference, status, branch_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: e_zwich_withdrawals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.e_zwich_withdrawals (id, transaction_reference, card_number, customer_name, amount, fee, partner_bank, customer_phone, branch_id, ezwich_settlement_account_id, status, transaction_date, reference, created_at, settlement_account_id, notes, user_id, processed_by) FROM stdin;
05139084-f67f-4f70-bbc4-01278889cd9a	EZW-WITHDRAWAL-1751026268409	8329759348	Jane Smith	199.99	5.00	GCB	0201234567	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-27 12:11:07.476922+00	EZW-WITHDRAWAL-1751026268409	2025-06-27 12:11:07.476922+00	1317f82e-b5ce-41a4-9997-6be9d2011431		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	admin@mimhaad.com
b9c71ea5-6ca2-4138-8ddd-35b61d4bb556	EZW-WITHDRAWAL-1751038288536	00007	Jane Smith	900.00	9.00	GCB	0244123456	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-27 15:31:28.007933+00	EZW-WITHDRAWAL-1751038288536	2025-06-27 15:31:28.007933+00	1317f82e-b5ce-41a4-9997-6be9d2011431		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	admin@mimhaad.com
eccbe748-c996-4982-88e5-1d993cc852fd	EZW-WITHDRAWAL-1751113562110	00006	Jane Smith	700.00	7.00	GCB	0574821675	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-28 12:26:02.554059+00	EZW-WITHDRAWAL-1751113562110	2025-06-28 12:26:02.554059+00	1317f82e-b5ce-41a4-9997-6be9d2011431		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	programmingwithsalim@gmail.com
02e5c4f7-3a60-455e-b6f4-a30375d22c17	EZW-WITHDRAWAL-1751204046957	78623658	Suadik	200.00	0.00	GCB	02378937823	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-29 13:34:07.364665+00	EZW-WITHDRAWAL-1751204046957	2025-06-29 13:34:07.364665+00	1317f82e-b5ce-41a4-9997-6be9d2011431		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c
2c223bd4-91e1-4410-9f00-432758dc88af	EZW-WITHDRAWAL-1751232748912	8729857	asjdfk	100.00	0.00	GCB	024759245	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-29 21:32:28.729353+00	EZW-WITHDRAWAL-1751232748912	2025-06-29 21:32:28.729353+00	1317f82e-b5ce-41a4-9997-6be9d2011431	shgkjhsdj	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c
217c2b0b-9796-4299-818d-6042dfe7595d	EZW-WITHDRAWAL-1751308588887	2638764264	afsdfadsf	100.00	0.00	GHIPPS	4674563465	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-30 21:34:06.050345+00	EZW-WITHDRAWAL-1751308588887	2025-06-30 21:34:06.050345+00	3c395f28-623a-48c7-ba29-724a2d9ced9d		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c
ac8a6554-67e9-47d9-92b6-f4ae29f98079	EZW-WITHDRAWAL-1751309489272	4875278554	dhfkajsfh	100.00	10.00	GHIPPS	0301234129	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-30 21:49:06.158586+00	EZW-WITHDRAWAL-1751309489272	2025-06-30 21:49:06.158586+00	3c395f28-623a-48c7-ba29-724a2d9ced9d		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c
44216b89-d063-4cd8-8fc2-2861c103433c	EZW-WITHDRAWAL-1751310478799	2361748623	Mohammed Salim	500.00	50.00	GHIPPS	037823238	635844ab-029a-43f8-8523-d7882915266a	\N	completed	2025-06-30 22:05:35.659645+00	EZW-WITHDRAWAL-1751310478799	2025-06-30 22:05:35.659645+00	3c395f28-623a-48c7-ba29-724a2d9ced9d		74c0a86e-2585-443f-9c2e-44fbb2bcd79c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c
\.


--
-- Data for Name: expense_approvals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expense_approvals (id, expense_id, approver_id, action, comments, created_at) FROM stdin;
\.


--
-- Data for Name: expense_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expense_attachments (id, expense_id, file_name, file_url, file_size, file_type, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: expense_heads; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expense_heads (id, name, category, description, gl_account_code, is_active, created_at, updated_at) FROM stdin;
09587b83-a2dc-48c6-959c-384a372a49bc	Office Supplies	Administrative	Stationery, printing, and office materials	6100	t	2025-05-25 17:32:52.233506+00	2025-05-25 17:32:52.233506+00
96559de5-4bae-4f8d-8c59-a3a714da9a2b	Utilities	Operational	Electricity, water, internet, and phone bills	6200	t	2025-05-25 17:32:52.816953+00	2025-05-25 17:32:52.816953+00
4b6a3f54-155f-451f-8e7c-0c84ac9b4965	Rent	Operational	Office and branch rent payments	6300	t	2025-05-25 17:32:53.150075+00	2025-05-25 17:32:53.150075+00
ba6fd64c-9ae9-458a-87a8-4f874097f193	Marketing	Marketing	Advertising, promotions, and marketing materials	6400	t	2025-05-25 17:32:53.67553+00	2025-05-25 17:32:53.67553+00
bbd47d99-11c3-4e59-8004-5b620a56714a	Travel & Transport	Administrative	Business travel, fuel, and transportation costs	6500	t	2025-05-25 17:32:53.98405+00	2025-05-25 17:32:53.98405+00
0237843c-e71a-4091-9300-1205c4589145	Professional Services	Administrative	Legal, accounting, and consulting fees	6600	t	2025-05-25 17:32:54.349724+00	2025-05-25 17:32:54.349724+00
087e333b-b9d9-4877-95f1-380b2fe6539d	Equipment Maintenance	Operational	Repair and maintenance of equipment	6700	t	2025-05-25 17:32:55.195903+00	2025-05-25 17:32:55.195903+00
4b924545-a3ca-488c-a2c4-40a0049222c9	Staff Training	Human Resources	Employee training and development costs	6800	t	2025-05-25 17:32:55.76167+00	2025-05-25 17:32:55.76167+00
f5d7ec66-12f4-4ab4-8e36-9fcb48cd7247	Insurance	Administrative	Business insurance premiums	6900	t	2025-05-25 17:32:56.301348+00	2025-05-25 17:32:56.301348+00
8c92637d-c617-470a-8e33-9a0a560c9ad7	Bank Charges	Financial	Banking fees and transaction charges	7100	t	2025-05-25 17:32:56.655545+00	2025-05-25 17:32:56.655545+00
bd8d5519-c5a1-4964-ac5d-886a7e605852	Power Purchase	Operational	Electricity credit purchases for resale	5100	t	2025-05-25 17:32:57.178895+00	2025-05-25 17:32:57.178895+00
0eea300e-e26e-4978-8ccf-3ce11ef99d30	Telecommunications	Operational	Airtime and data purchases for resale	5200	t	2025-05-25 17:32:57.832351+00	2025-05-25 17:32:57.832351+00
52c9148c-b16d-4bd3-a747-19e1fb3a4146	Cash Transportation	Security	Armored car and cash-in-transit services	7200	t	2025-05-25 17:32:58.154199+00	2025-05-25 17:32:58.154199+00
99ed2185-897b-432c-a8d6-c3d325f03007	Security Services	Security	Security guard and surveillance costs	7300	t	2025-05-25 17:32:58.684661+00	2025-05-25 17:32:58.684661+00
df1718ca-3e87-46bd-b200-9d98b5511863	Cleaning Services	Operational	Janitorial and cleaning services	7400	t	2025-05-25 17:32:59.282879+00	2025-05-25 17:32:59.282879+00
27db3952-1fc0-4277-a843-7637a7f46a85	sdgsdfg	administrative	sdfgfd	\N	t	2025-06-10 19:40:12.109284+00	2025-06-10 19:40:12.109284+00
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expenses (id, reference_number, branch_id, expense_head_id, amount, description, expense_date, payment_source, payment_account_id, status, created_by, approved_by, approved_at, paid_by, paid_at, rejected_by, rejected_at, rejection_reason, gl_journal_entry_id, created_at, updated_at, comments, notes) FROM stdin;
6c9da8e9-117f-4e0b-8a72-8dd8a5fa07bb	EXP-2025-813344	635844ab-029a-43f8-8523-d7882915266a	8c92637d-c617-470a-8e33-9a0a560c9ad7	200.00	SRC PRESIDENT	2025-06-24	cash	\N	approved	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	00000000-0000-0000-0000-000000000001	2025-06-24 21:00:26.952714+00	\N	\N	\N	\N	\N	\N	2025-06-24 21:00:14.378939+00	2025-06-24 21:00:26.952714+00	Approved via expense detail view	\N
cb99fda7-5c4d-434b-93e6-2909c82e9074	EXP-2025-658716	635844ab-029a-43f8-8523-d7882915266a	df1718ca-3e87-46bd-b200-9d98b5511863	100.00	sdfgasdsf	2025-06-29	cash	\N	approved	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	00000000-0000-0000-0000-000000000001	2025-06-29 20:57:58.299483+00	\N	\N	\N	\N	\N	\N	2025-06-29 20:57:39.000209+00	2025-06-29 20:57:58.299483+00	Approved via expense detail view	\N
\.


--
-- Data for Name: ezwich_card_batches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ezwich_card_batches (id, batch_code, quantity_received, quantity_issued, card_type, expiry_date, status, branch_id, created_by, notes, created_at, updated_at) FROM stdin;
284f2cef-ac00-43c8-affa-5333477bc5eb	BATCH-1750888141471-EPIF	100	1	standard	2030-06-25	received	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c		2025-06-25 21:49:03.596429+00	2025-06-30 10:09:35.9459+00
\.


--
-- Data for Name: ezwich_cards; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ezwich_cards (id, card_number, batch_id, customer_name, customer_phone, customer_email, date_of_birth, gender, id_type, id_number, id_expiry_date, address_line1, address_line2, city, region, postal_code, country, card_status, issue_date, expiry_date, branch_id, issued_by, fee_charged, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ezwich_stock_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ezwich_stock_movements (id, batch_id, batch_code, previous_quantity, new_quantity, quantity_change, movement_type, notes, user_id, username, branch_id, created_at) FROM stdin;
\.


--
-- Data for Name: ezwich_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ezwich_transactions (id, type, amount, customer_name, customer_phone, card_number, partner_bank, status, branch_id, user_id, settlement_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ezwich_withdrawals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ezwich_withdrawals (id, transaction_reference, card_number, customer_name, customer_phone, amount, fee, branch_id, processed_by, status, transaction_date, terminal_id, receipt_number, notes, created_at) FROM stdin;
\.


--
-- Data for Name: fee_config; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fee_config (id, service_type, transaction_type, fee_type, fee_value, minimum_fee, maximum_fee, currency, tier_min_amount, tier_max_amount, is_active, effective_date, created_at, updated_at, created_by, updated_by) FROM stdin;
1	momo	deposit	percentage	1.5000	1.00	50.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
2	momo	withdrawal	percentage	2.0000	2.00	100.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
3	agency_banking	deposit	fixed	5.0000	0.00	0.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
4	agency_banking	withdrawal	fixed	10.0000	0.00	0.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
5	agency_banking	interbank_transfer	fixed	15.0000	0.00	0.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
6	e_zwich	card_issuance	fixed	15.0000	0.00	0.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
7	e_zwich	withdrawal	percentage	1.5000	1.50	50.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
8	power	transaction	percentage	2.0000	1.00	25.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
9	jumia	transaction	percentage	1.0000	0.50	20.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
10	interbank	transfer	fixed	20.0000	0.00	0.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
11	interbank	inquiry	fixed	2.0000	0.00	0.00	GHS	0.00	\N	t	2025-07-01	2025-07-01 21:13:46.474721	2025-07-01 21:13:46.474721	\N	\N
\.


--
-- Data for Name: float_account_gl_mapping; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.float_account_gl_mapping (id, float_account_id, gl_account_id, mapping_type, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: float_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.float_accounts (id, branch_id, account_type, provider, account_number, current_balance, min_threshold, max_threshold, is_active, created_by, created_at, updated_at, last_updated, isezwichpartner) FROM stdin;
d1a2470c-3528-426e-afd5-b40d0f2ba9ca	635844ab-029a-43f8-8523-d7882915266a	power	ECG	POWER-NEDCO-2915266a	6800.00	0.00	10000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 15:39:05.00553+00	2025-07-01 20:56:39.01621+00	2025-06-24 19:10:59.925124+00	f
3c395f28-623a-48c7-ba29-724a2d9ced9d	635844ab-029a-43f8-8523-d7882915266a	e-zwich	GHIPPS	9040011498129	500.00	0.00	10000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-05-29 14:52:57.136317+00	2025-07-01 06:54:05.79093+00	2025-06-25 22:42:28.385441+00	f
49f9aec4-8c95-42a9-b9d2-7a2688d0096c	635844ab-029a-43f8-8523-d7882915266a	momo	Z-Pay	0245874125	6097.99	1000.00	50000.00	t	550e8400-e29b-41d4-a716-446655440000	2025-06-24 21:18:41.186916+00	2025-07-01 11:02:19.354666+00	2025-06-26 06:55:45.728967+00	f
6b9ecce7-3be8-42d7-9df5-fdcb3ef72ecf	45924a0f-eca7-4e34-ad4f-a86272ad72d9	cash-in-till	CASH	\N	30000.00	1000.00	50000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-05 15:27:58.560793+00	2025-07-01 12:07:04.964988+00	2025-06-05 15:27:58.560793+00	f
141439f2-e534-45e7-9a3c-0b856cecfdad	635844ab-029a-43f8-8523-d7882915266a	momo	Telecel	0506068893	10705.00	5000.00	200000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-05-23 22:40:29.672574+00	2025-07-01 12:07:05.569325+00	2025-06-25 16:58:28.524441+00	f
23e6d856-4252-49ed-9a24-106fbf1f4265	45924a0f-eca7-4e34-ad4f-a86272ad72d9	momo	MTN	0549514616	25000.00	5000.00	50000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 02:02:26.156729+00	2025-06-22 02:22:23.917947+00	2025-06-22 02:02:26.156729+00	f
2fe947a8-c85f-42b8-9aff-c85bc4439484	635844ab-029a-43f8-8523-d7882915266a	power	NEDCo	POWER-NEDCo-2915266a	714.00	0.00	10000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-25 23:21:13.489616+00	2025-07-01 20:30:48.543072+00	2025-06-28 12:43:03.07819+00	f
1317f82e-b5ce-41a4-9997-6be9d2011431	635844ab-029a-43f8-8523-d7882915266a	agency-banking	GCB	2464402761018	118394.00	1000.00	10000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-21 21:58:39.39954+00	2025-06-30 15:15:43.314094+00	2025-06-21 21:58:39.39954+00	t
0c6320ae-fb6c-408e-8cfa-934d6d253087	635844ab-029a-43f8-8523-d7882915266a	momo	MTN	0549514617	1800.00	0.00	0.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-05-29 14:52:31.139902+00	2025-07-02 13:33:10.763862+00	2025-06-25 16:29:50.618835+00	f
99cf91d9-dd30-4553-8cb7-f37a1a88e025	635844ab-029a-43f8-8523-d7882915266a	cash-in-till	CASH	\N	93209.10	1000.00	50000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-05-23 11:51:40.229376+00	2025-07-02 13:33:10.979076+00	2025-06-28 12:43:06.498206+00	f
aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	635844ab-029a-43f8-8523-d7882915266a	agency-banking	Fidelity Bank	80245647854621	35484.21	10000.00	500000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-05-24 15:53:59.174391+00	2025-06-27 07:29:30.209138+00	2025-05-24 15:53:59.174391+00	f
0b23f10b-21c5-47da-9e51-075887aad6ee	635844ab-029a-43f8-8523-d7882915266a	agency-banking	Cal Bank	9040011498129	23610.00	10000.00	500000.00	t	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-05-28 15:13:21.257577+00	2025-06-27 15:30:51.307384+00	2025-05-28 15:13:21.257577+00	f
\.


--
-- Data for Name: float_gl_mapping; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.float_gl_mapping (id, float_account_id, gl_account_id, mapping_type, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: float_gl_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.float_gl_mappings (id, float_account_id, gl_account_id, mapping_type, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: float_recharge_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.float_recharge_transactions (id, float_account_id, amount, balance_before, balance_after, recharge_method, reference, notes, processed_by, branch_id, user_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: float_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.float_transactions (id, account_id, transaction_type, amount, description, reference, created_at, balance_before, balance_after, updated_at, created_by, branch_id, processed_by, user_id, status, float_account_id, reference_id, type) FROM stdin;
\.


--
-- Data for Name: gl_account_balances; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gl_account_balances (id, account_id, current_balance, last_updated, period_balances, branch_id) FROM stdin;
\.


--
-- Data for Name: gl_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at, branch_id) FROM stdin;
613b5cee-71a0-4b81-8711-f1062292ed08	AGB-635844	Agency Banking Float - Cal Bank	Asset	\N	0.00	t	2025-07-01 21:38:50.566287+00	2025-07-01 21:38:50.566287+00	635844ab-029a-43f8-8523-d7882915266a
a17161c8-0592-4a1c-822e-9a3ee1031fa4	AGB-635844-GCB	Agency Banking Float - GCB	Asset	\N	0.00	t	2025-07-01 21:38:50.566287+00	2025-07-01 21:38:50.566287+00	635844ab-029a-43f8-8523-d7882915266a
64838f8a-b1ba-461f-8778-6a8e6646282a	AGB-635844-FID	Agency Banking Float - Fidelity	Asset	\N	0.00	t	2025-07-01 21:38:50.566287+00	2025-07-01 21:38:50.566287+00	635844ab-029a-43f8-8523-d7882915266a
93620bba-2d00-4178-8a7f-395c1170e81f	MOMO-635844-MTN	MoMo Float - MTN	Asset	\N	0.00	t	2025-07-01 21:38:50.839902+00	2025-07-01 21:38:50.839902+00	635844ab-029a-43f8-8523-d7882915266a
10334c13-1e4a-4143-831b-2d7527c90230	MOMO-635844-TEL	MoMo Float - Telecel	Asset	\N	0.00	t	2025-07-01 21:38:50.839902+00	2025-07-01 21:38:50.839902+00	635844ab-029a-43f8-8523-d7882915266a
367b415b-950b-458f-9ec0-e369c6ef6a1a	MOMO-635844-ZPAY	MoMo Float - Z-Pay	Asset	\N	0.00	t	2025-07-01 21:38:50.839902+00	2025-07-01 21:38:50.839902+00	635844ab-029a-43f8-8523-d7882915266a
2cc88be1-f89c-4c68-88dd-385e798c320d	PWR-635844-NEDCO	Power Float - NEDCo	Asset	\N	0.00	t	2025-07-01 21:38:51.054283+00	2025-07-01 21:38:51.054283+00	635844ab-029a-43f8-8523-d7882915266a
19bb8ad7-e8c5-4ea2-8978-1fc38db3aa10	PWR-635844-ECG	Power Float - ECG	Asset	\N	0.00	t	2025-07-01 21:38:51.054283+00	2025-07-01 21:38:51.054283+00	635844ab-029a-43f8-8523-d7882915266a
514767d8-e8ba-4ac2-8604-1885c67694c4	CASH-635844	Cash in Till	Asset	\N	0.00	t	2025-07-01 21:38:51.286156+00	2025-07-01 21:38:51.286156+00	635844ab-029a-43f8-8523-d7882915266a
d6f63a11-9886-4550-bc09-d50a2a60f9e0	EZWICH-635844	E-Zwich Float	Asset	\N	0.00	t	2025-07-01 21:38:51.520383+00	2025-07-01 21:38:51.520383+00	635844ab-029a-43f8-8523-d7882915266a
1f821de8-72ce-42f0-aaab-b5674dee8f44	AGB-635844-CAL-FEE	Agency Banking Fee - Cal Bank	Revenue	\N	0.00	t	2025-07-01 21:47:05.209417+00	2025-07-01 21:47:05.209417+00	635844ab-029a-43f8-8523-d7882915266a
1d950287-ef78-4bfd-b46d-587ff8284c26	AGB-635844-GCB-FEE	Agency Banking Fee - GCB	Revenue	\N	0.00	t	2025-07-01 21:47:05.209417+00	2025-07-01 21:47:05.209417+00	635844ab-029a-43f8-8523-d7882915266a
23b90e7e-3cf9-47f5-8a76-84b51d261eb9	AGB-635844-FID-FEE	Agency Banking Fee - Fidelity	Revenue	\N	0.00	t	2025-07-01 21:47:05.209417+00	2025-07-01 21:47:05.209417+00	635844ab-029a-43f8-8523-d7882915266a
7ee3c6ad-81f5-43f0-b62e-a73e1f295b1a	AGB-635844-CAL-REV	Agency Banking Revenue - Cal Bank	Revenue	\N	0.00	t	2025-07-01 21:47:05.449438+00	2025-07-01 21:47:05.449438+00	635844ab-029a-43f8-8523-d7882915266a
0c85646a-54c9-479d-9138-ba9e34361965	AGB-635844-GCB-REV	Agency Banking Revenue - GCB	Revenue	\N	0.00	t	2025-07-01 21:47:05.449438+00	2025-07-01 21:47:05.449438+00	635844ab-029a-43f8-8523-d7882915266a
cc538c70-c9ec-439d-a3f4-d9eb5a6f1ad1	AGB-635844-FID-REV	Agency Banking Revenue - Fidelity	Revenue	\N	0.00	t	2025-07-01 21:47:05.449438+00	2025-07-01 21:47:05.449438+00	635844ab-029a-43f8-8523-d7882915266a
7df8edc8-4f4b-4a45-a246-d439c7aff0ec	AGB-635844-CAL-EXP	Agency Banking Expense - Cal Bank	Expense	\N	0.00	t	2025-07-01 21:47:05.922458+00	2025-07-01 21:47:05.922458+00	635844ab-029a-43f8-8523-d7882915266a
d6dee038-e255-4feb-8fa5-b8d4a9ecd0da	AGB-635844-GCB-EXP	Agency Banking Expense - GCB	Expense	\N	0.00	t	2025-07-01 21:47:05.922458+00	2025-07-01 21:47:05.922458+00	635844ab-029a-43f8-8523-d7882915266a
182d9a1a-890c-4bfc-900a-2608b9eebbfb	AGB-635844-FID-EXP	Agency Banking Expense - Fidelity	Expense	\N	0.00	t	2025-07-01 21:47:05.922458+00	2025-07-01 21:47:05.922458+00	635844ab-029a-43f8-8523-d7882915266a
316438b6-48d7-4297-83d2-551098693dfc	AGB-635844-CAL-COM	Agency Banking Commission - Cal Bank	Expense	\N	0.00	t	2025-07-01 21:47:06.169657+00	2025-07-01 21:47:06.169657+00	635844ab-029a-43f8-8523-d7882915266a
43a45299-43e3-4c65-881e-d3586790519d	AGB-635844-GCB-COM	Agency Banking Commission - GCB	Expense	\N	0.00	t	2025-07-01 21:47:06.169657+00	2025-07-01 21:47:06.169657+00	635844ab-029a-43f8-8523-d7882915266a
ce880a95-07c8-40b8-8cf0-1fc4999ca783	AGB-635844-FID-COM	Agency Banking Commission - Fidelity	Expense	\N	0.00	t	2025-07-01 21:47:06.169657+00	2025-07-01 21:47:06.169657+00	635844ab-029a-43f8-8523-d7882915266a
1dea5839-5377-45f0-b015-4fdbd0198b96	MOMO-635844-MTN-FEE	MoMo Fee - MTN	Revenue	\N	0.00	t	2025-07-01 21:47:21.617322+00	2025-07-01 21:47:21.617322+00	635844ab-029a-43f8-8523-d7882915266a
d44b7df1-8fe8-47e1-a3bd-cd1827b33e0b	MOMO-635844-TEL-FEE	MoMo Fee - Telecel	Revenue	\N	0.00	t	2025-07-01 21:47:21.617322+00	2025-07-01 21:47:21.617322+00	635844ab-029a-43f8-8523-d7882915266a
ee6594f8-74eb-4d62-a097-db475fc3b49e	MOMO-635844-ZPAY-FEE	MoMo Fee - Z-Pay	Revenue	\N	0.00	t	2025-07-01 21:47:21.617322+00	2025-07-01 21:47:21.617322+00	635844ab-029a-43f8-8523-d7882915266a
6cae35d1-baba-4fae-9f79-9101dd28024b	MOMO-635844-MTN-REV	MoMo Revenue - MTN	Revenue	\N	0.00	t	2025-07-01 21:47:21.86544+00	2025-07-01 21:47:21.86544+00	635844ab-029a-43f8-8523-d7882915266a
22fc986f-461a-4772-bf22-88d5f8382ddc	MOMO-635844-TEL-REV	MoMo Revenue - Telecel	Revenue	\N	0.00	t	2025-07-01 21:47:21.86544+00	2025-07-01 21:47:21.86544+00	635844ab-029a-43f8-8523-d7882915266a
f52935b1-aa7e-4e7f-85cb-590bad9b0874	MOMO-635844-ZPAY-REV	MoMo Revenue - Z-Pay	Revenue	\N	0.00	t	2025-07-01 21:47:21.86544+00	2025-07-01 21:47:21.86544+00	635844ab-029a-43f8-8523-d7882915266a
d8dd63b2-c8c5-4899-ba27-3e60bef2cd60	MOMO-635844-MTN-EXP	MoMo Expense - MTN	Expense	\N	0.00	t	2025-07-01 21:47:22.153448+00	2025-07-01 21:47:22.153448+00	635844ab-029a-43f8-8523-d7882915266a
96e89d69-c160-4df2-a592-7ae50379fd55	MOMO-635844-TEL-EXP	MoMo Expense - Telecel	Expense	\N	0.00	t	2025-07-01 21:47:22.153448+00	2025-07-01 21:47:22.153448+00	635844ab-029a-43f8-8523-d7882915266a
f9e9797a-bef5-4e37-8ff5-10eb4fdc2c5b	MOMO-635844-ZPAY-EXP	MoMo Expense - Z-Pay	Expense	\N	0.00	t	2025-07-01 21:47:22.153448+00	2025-07-01 21:47:22.153448+00	635844ab-029a-43f8-8523-d7882915266a
e0ead524-bdbc-4cd6-afd9-0efd78776d89	MOMO-635844-MTN-COM	MoMo Commission - MTN	Expense	\N	0.00	t	2025-07-01 21:47:22.449357+00	2025-07-01 21:47:22.449357+00	635844ab-029a-43f8-8523-d7882915266a
48bb8558-3a29-472e-a567-732d42ce4a44	MOMO-635844-TEL-COM	MoMo Commission - Telecel	Expense	\N	0.00	t	2025-07-01 21:47:22.449357+00	2025-07-01 21:47:22.449357+00	635844ab-029a-43f8-8523-d7882915266a
f871c7d1-9dc7-4ddf-865b-a6bc246552cd	MOMO-635844-ZPAY-COM	MoMo Commission - Z-Pay	Expense	\N	0.00	t	2025-07-01 21:47:22.449357+00	2025-07-01 21:47:22.449357+00	635844ab-029a-43f8-8523-d7882915266a
d8e90e8e-a3ac-423a-be66-561dc65bb651	PWR-635844-NEDCO-FEE	Power Fee - NEDCo	Revenue	\N	0.00	t	2025-07-01 21:47:36.169093+00	2025-07-01 21:47:36.169093+00	635844ab-029a-43f8-8523-d7882915266a
b1c2f3d4-6993-4287-81ef-00965c21fd20	PWR-635844-ECG-FEE	Power Fee - ECG	Revenue	\N	0.00	t	2025-07-01 21:47:36.169093+00	2025-07-01 21:47:36.169093+00	635844ab-029a-43f8-8523-d7882915266a
d4f2a849-140d-4e4b-a356-6251774da202	PWR-635844-NEDCO-REV	Power Revenue - NEDCo	Revenue	\N	0.00	t	2025-07-01 21:47:36.394614+00	2025-07-01 21:47:36.394614+00	635844ab-029a-43f8-8523-d7882915266a
b0c0c93c-5255-464d-88c2-6e2f6fa53045	PWR-635844-ECG-REV	Power Revenue - ECG	Revenue	\N	0.00	t	2025-07-01 21:47:36.394614+00	2025-07-01 21:47:36.394614+00	635844ab-029a-43f8-8523-d7882915266a
53106340-7c18-4f7d-ac41-1024a465c8fe	PWR-635844-NEDCO-EXP	Power Expense - NEDCo	Expense	\N	0.00	t	2025-07-01 21:47:36.696858+00	2025-07-01 21:47:36.696858+00	635844ab-029a-43f8-8523-d7882915266a
77b8a654-b64a-4fb1-a38a-5c4339c6b71b	PWR-635844-ECG-EXP	Power Expense - ECG	Expense	\N	0.00	t	2025-07-01 21:47:36.696858+00	2025-07-01 21:47:36.696858+00	635844ab-029a-43f8-8523-d7882915266a
45454d3e-cb91-4804-b9cc-973fd2ab9003	PWR-635844-NEDCO-COM	Power Commission - NEDCo	Expense	\N	0.00	t	2025-07-01 21:47:36.969052+00	2025-07-01 21:47:36.969052+00	635844ab-029a-43f8-8523-d7882915266a
2b4890a3-91f1-4195-b892-7c3eaf1c7371	PWR-635844-ECG-COM	Power Commission - ECG	Expense	\N	0.00	t	2025-07-01 21:47:36.969052+00	2025-07-01 21:47:36.969052+00	635844ab-029a-43f8-8523-d7882915266a
edcad4d6-ae4b-4013-b993-db4e3706e856	CASH-635844-FEE	Cash in Till Fee	Revenue	\N	0.00	t	2025-07-01 21:49:46.073607+00	2025-07-01 21:49:46.073607+00	635844ab-029a-43f8-8523-d7882915266a
b9853e18-2455-4aef-8744-013eade3e7a2	CASH-635844-REV	Cash in Till Revenue	Revenue	\N	0.00	t	2025-07-01 21:49:46.345698+00	2025-07-01 21:49:46.345698+00	635844ab-029a-43f8-8523-d7882915266a
220adfea-2d46-4542-a6d6-51dda1763bbb	CASH-635844-EXP	Cash in Till Expense	Expense	\N	0.00	t	2025-07-01 21:49:46.793413+00	2025-07-01 21:49:46.793413+00	635844ab-029a-43f8-8523-d7882915266a
d58ddd8a-3fe0-4f3b-ab48-fc3732fe8db7	CASH-635844-COM	Cash in Till Commission	Expense	\N	0.00	t	2025-07-01 21:49:47.089227+00	2025-07-01 21:49:47.089227+00	635844ab-029a-43f8-8523-d7882915266a
2875a613-bfe9-4488-858e-8b695a8200c9	EZWICH-635844-FEE	E-Zwich Fee	Revenue	\N	0.00	t	2025-07-01 21:49:55.874254+00	2025-07-01 21:49:55.874254+00	635844ab-029a-43f8-8523-d7882915266a
71806a6b-e8d1-49fa-a8ec-2d5f0cb12edf	EZWICH-635844-REV	E-Zwich Revenue	Revenue	\N	0.00	t	2025-07-01 21:49:56.257391+00	2025-07-01 21:49:56.257391+00	635844ab-029a-43f8-8523-d7882915266a
8e739170-320b-48e3-9dc7-67f08339ca63	EZWICH-635844-EXP	E-Zwich Expense	Expense	\N	0.00	t	2025-07-01 21:49:56.546696+00	2025-07-01 21:49:56.546696+00	635844ab-029a-43f8-8523-d7882915266a
b3a725bc-12fb-4f9a-beb4-3bd962cde116	EZWICH-635844-COM	E-Zwich Commission	Expense	\N	0.00	t	2025-07-01 21:49:56.977366+00	2025-07-01 21:49:56.977366+00	635844ab-029a-43f8-8523-d7882915266a
\.


--
-- Data for Name: gl_journal_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: gl_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gl_mappings (id, branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active, created_at, updated_at) FROM stdin;
1f2fa0d0-beea-42a5-8096-2f27276819ac	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	613b5cee-71a0-4b81-8711-f1062292ed08	0b23f10b-21c5-47da-9e51-075887aad6ee	main	t	2025-07-01 21:42:21.534903+00	2025-07-01 21:42:21.534903+00
f06cb989-626c-4a51-bfc3-2f6b18626a10	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	a17161c8-0592-4a1c-822e-9a3ee1031fa4	1317f82e-b5ce-41a4-9997-6be9d2011431	main	t	2025-07-01 21:42:21.534903+00	2025-07-01 21:42:21.534903+00
f5426fef-ef98-4d5f-a427-bce5a4c827ae	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	64838f8a-b1ba-461f-8778-6a8e6646282a	aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	main	t	2025-07-01 21:42:21.534903+00	2025-07-01 21:42:21.534903+00
2fb55504-f5b2-4da2-b10e-e74815b09f90	635844ab-029a-43f8-8523-d7882915266a	momo_float	93620bba-2d00-4178-8a7f-395c1170e81f	0c6320ae-fb6c-408e-8cfa-934d6d253087	main	t	2025-07-01 21:42:21.863495+00	2025-07-01 21:42:21.863495+00
f6ea86df-3c3b-4790-9831-5045b3427427	635844ab-029a-43f8-8523-d7882915266a	momo_float	10334c13-1e4a-4143-831b-2d7527c90230	141439f2-e534-45e7-9a3c-0b856cecfdad	main	t	2025-07-01 21:42:21.863495+00	2025-07-01 21:42:21.863495+00
3fa2ceb9-e380-405c-a3b9-94709e1bd9f4	635844ab-029a-43f8-8523-d7882915266a	momo_float	367b415b-950b-458f-9ec0-e369c6ef6a1a	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	main	t	2025-07-01 21:42:21.863495+00	2025-07-01 21:42:21.863495+00
05ab8a55-7265-4b75-9d14-df9e66adc619	635844ab-029a-43f8-8523-d7882915266a	power_float	2cc88be1-f89c-4c68-88dd-385e798c320d	2fe947a8-c85f-42b8-9aff-c85bc4439484	main	t	2025-07-01 21:42:22.150546+00	2025-07-01 21:42:22.150546+00
74732d7f-485b-4169-bcca-0b4cfea0ee4a	635844ab-029a-43f8-8523-d7882915266a	power_float	19bb8ad7-e8c5-4ea2-8978-1fc38db3aa10	d1a2470c-3528-426e-afd5-b40d0f2ba9ca	main	t	2025-07-01 21:42:22.150546+00	2025-07-01 21:42:22.150546+00
8a121468-45f1-4ef1-8d45-9e6f21fb7ac2	635844ab-029a-43f8-8523-d7882915266a	cash_in_till	514767d8-e8ba-4ac2-8604-1885c67694c4	99cf91d9-dd30-4553-8cb7-f37a1a88e025	main	t	2025-07-01 21:42:22.758463+00	2025-07-01 21:42:22.758463+00
252fbd3a-5af1-4fa4-9a78-4a124d404a7c	635844ab-029a-43f8-8523-d7882915266a	e_zwich_float	d6f63a11-9886-4550-bc09-d50a2a60f9e0	3c395f28-623a-48c7-ba29-724a2d9ced9d	main	t	2025-07-01 21:42:23.230492+00	2025-07-01 21:42:23.230492+00
9c607830-fce6-45df-9ce0-c0e1c2bada09	635844ab-029a-43f8-8523-d7882915266a	cash_in_till	edcad4d6-ae4b-4013-b993-db4e3706e856	99cf91d9-dd30-4553-8cb7-f37a1a88e025	fee	t	2025-07-01 21:56:42.391752+00	2025-07-01 21:56:42.391752+00
ec912aba-e4cc-41ab-8a2e-dd7d059cfd53	635844ab-029a-43f8-8523-d7882915266a	cash_in_till	b9853e18-2455-4aef-8744-013eade3e7a2	99cf91d9-dd30-4553-8cb7-f37a1a88e025	revenue	t	2025-07-01 21:56:54.534293+00	2025-07-01 21:56:54.534293+00
2c223e63-a224-4a2f-b79a-21b0725be26b	635844ab-029a-43f8-8523-d7882915266a	cash_in_till	220adfea-2d46-4542-a6d6-51dda1763bbb	99cf91d9-dd30-4553-8cb7-f37a1a88e025	expense	t	2025-07-01 21:56:54.790867+00	2025-07-01 21:56:54.790867+00
0b28e4c8-43ef-4b35-b7c2-82ba51124572	635844ab-029a-43f8-8523-d7882915266a	cash_in_till	d58ddd8a-3fe0-4f3b-ab48-fc3732fe8db7	99cf91d9-dd30-4553-8cb7-f37a1a88e025	commission	t	2025-07-01 21:56:55.183046+00	2025-07-01 21:56:55.183046+00
cb5c04e6-5523-48e5-8ac0-438e54e90968	635844ab-029a-43f8-8523-d7882915266a	e_zwich_float	2875a613-bfe9-4488-858e-8b695a8200c9	3c395f28-623a-48c7-ba29-724a2d9ced9d	fee	t	2025-07-01 21:57:48.390111+00	2025-07-01 21:57:48.390111+00
3cc874ce-43eb-48fd-9cfb-165f35083a68	635844ab-029a-43f8-8523-d7882915266a	e_zwich_float	71806a6b-e8d1-49fa-a8ec-2d5f0cb12edf	3c395f28-623a-48c7-ba29-724a2d9ced9d	revenue	t	2025-07-01 21:57:58.390049+00	2025-07-01 21:57:58.390049+00
12d6963a-6588-486d-9c02-495402644bfc	635844ab-029a-43f8-8523-d7882915266a	e_zwich_float	8e739170-320b-48e3-9dc7-67f08339ca63	3c395f28-623a-48c7-ba29-724a2d9ced9d	expense	t	2025-07-01 21:57:58.632124+00	2025-07-01 21:57:58.632124+00
71783937-d7a4-4ea1-a21c-8a72f903500e	635844ab-029a-43f8-8523-d7882915266a	e_zwich_float	b3a725bc-12fb-4f9a-beb4-3bd962cde116	3c395f28-623a-48c7-ba29-724a2d9ced9d	commission	t	2025-07-01 21:57:58.871008+00	2025-07-01 21:57:58.871008+00
e355e883-4e5e-47bf-83e6-c14530805ec1	635844ab-029a-43f8-8523-d7882915266a	momo_float	1dea5839-5377-45f0-b015-4fdbd0198b96	0c6320ae-fb6c-408e-8cfa-934d6d253087	fee	t	2025-07-01 22:02:31.991267+00	2025-07-01 22:02:31.991267+00
92183e30-0f0b-452f-acca-a387897f7615	635844ab-029a-43f8-8523-d7882915266a	momo_float	6cae35d1-baba-4fae-9f79-9101dd28024b	0c6320ae-fb6c-408e-8cfa-934d6d253087	revenue	t	2025-07-01 22:02:31.991267+00	2025-07-01 22:02:31.991267+00
63d7bada-69a3-4593-a894-99dd9175e47d	635844ab-029a-43f8-8523-d7882915266a	momo_float	d8dd63b2-c8c5-4899-ba27-3e60bef2cd60	0c6320ae-fb6c-408e-8cfa-934d6d253087	expense	t	2025-07-01 22:02:31.991267+00	2025-07-01 22:02:31.991267+00
a5cf2d89-d92c-4af1-bfd8-576a10b24e17	635844ab-029a-43f8-8523-d7882915266a	momo_float	e0ead524-bdbc-4cd6-afd9-0efd78776d89	0c6320ae-fb6c-408e-8cfa-934d6d253087	commission	t	2025-07-01 22:02:31.991267+00	2025-07-01 22:02:31.991267+00
01c1b700-3d5d-4699-83b8-dea076b3ca65	635844ab-029a-43f8-8523-d7882915266a	momo_float	d44b7df1-8fe8-47e1-a3bd-cd1827b33e0b	141439f2-e534-45e7-9a3c-0b856cecfdad	fee	t	2025-07-01 22:02:32.25232+00	2025-07-01 22:02:32.25232+00
9de68d11-d7a2-47ce-8cff-cc9138c77229	635844ab-029a-43f8-8523-d7882915266a	momo_float	22fc986f-461a-4772-bf22-88d5f8382ddc	141439f2-e534-45e7-9a3c-0b856cecfdad	revenue	t	2025-07-01 22:02:32.25232+00	2025-07-01 22:02:32.25232+00
c58f501e-8420-4cf3-8635-2a556faed42f	635844ab-029a-43f8-8523-d7882915266a	momo_float	96e89d69-c160-4df2-a592-7ae50379fd55	141439f2-e534-45e7-9a3c-0b856cecfdad	expense	t	2025-07-01 22:02:32.25232+00	2025-07-01 22:02:32.25232+00
e2b3e37b-9cfc-442f-a313-6741c3b7663f	635844ab-029a-43f8-8523-d7882915266a	momo_float	48bb8558-3a29-472e-a567-732d42ce4a44	141439f2-e534-45e7-9a3c-0b856cecfdad	commission	t	2025-07-01 22:02:32.25232+00	2025-07-01 22:02:32.25232+00
b34e8d2a-ada3-4349-866e-ccfe9addf1f5	635844ab-029a-43f8-8523-d7882915266a	momo_float	ee6594f8-74eb-4d62-a097-db475fc3b49e	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	fee	t	2025-07-01 22:02:32.660737+00	2025-07-01 22:02:32.660737+00
5ed02313-ec74-46d0-ba15-a2e10bb0bc0b	635844ab-029a-43f8-8523-d7882915266a	momo_float	f52935b1-aa7e-4e7f-85cb-590bad9b0874	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	revenue	t	2025-07-01 22:02:32.660737+00	2025-07-01 22:02:32.660737+00
3d06d276-e9d0-452d-8351-15b4eb3432e2	635844ab-029a-43f8-8523-d7882915266a	momo_float	f9e9797a-bef5-4e37-8ff5-10eb4fdc2c5b	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	expense	t	2025-07-01 22:02:32.660737+00	2025-07-01 22:02:32.660737+00
0ec298c7-c8bc-45b0-b25a-9e1dd4175183	635844ab-029a-43f8-8523-d7882915266a	momo_float	f871c7d1-9dc7-4ddf-865b-a6bc246552cd	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	commission	t	2025-07-01 22:02:32.660737+00	2025-07-01 22:02:32.660737+00
5aad2bc6-42a6-43e9-ac1b-8c7ef9a7a592	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	1f821de8-72ce-42f0-aaab-b5674dee8f44	0b23f10b-21c5-47da-9e51-075887aad6ee	fee	t	2025-07-01 22:02:33.000405+00	2025-07-01 22:02:33.000405+00
4670d86c-0d8c-457a-aeb4-089f522aaac3	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	7ee3c6ad-81f5-43f0-b62e-a73e1f295b1a	0b23f10b-21c5-47da-9e51-075887aad6ee	revenue	t	2025-07-01 22:02:33.000405+00	2025-07-01 22:02:33.000405+00
0b910c66-d441-4238-9654-6781a22dc253	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	7df8edc8-4f4b-4a45-a246-d439c7aff0ec	0b23f10b-21c5-47da-9e51-075887aad6ee	expense	t	2025-07-01 22:02:33.000405+00	2025-07-01 22:02:33.000405+00
efdae409-96d7-432a-8c8d-2d7f0594b8d1	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	316438b6-48d7-4297-83d2-551098693dfc	0b23f10b-21c5-47da-9e51-075887aad6ee	commission	t	2025-07-01 22:02:33.000405+00	2025-07-01 22:02:33.000405+00
79fca436-8580-493b-96e8-0e7d1b019252	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	1d950287-ef78-4bfd-b46d-587ff8284c26	1317f82e-b5ce-41a4-9997-6be9d2011431	fee	t	2025-07-01 22:02:33.252338+00	2025-07-01 22:02:33.252338+00
bba9b581-32b2-4e9e-801e-772146351b67	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	0c85646a-54c9-479d-9138-ba9e34361965	1317f82e-b5ce-41a4-9997-6be9d2011431	revenue	t	2025-07-01 22:02:33.252338+00	2025-07-01 22:02:33.252338+00
ad7b841e-7d56-4ca1-a2f6-58b1df7240dd	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	d6dee038-e255-4feb-8fa5-b8d4a9ecd0da	1317f82e-b5ce-41a4-9997-6be9d2011431	expense	t	2025-07-01 22:02:33.252338+00	2025-07-01 22:02:33.252338+00
122e6409-1d17-4509-92f4-1808b07b118f	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	43a45299-43e3-4c65-881e-d3586790519d	1317f82e-b5ce-41a4-9997-6be9d2011431	commission	t	2025-07-01 22:02:33.252338+00	2025-07-01 22:02:33.252338+00
41764ac6-49ca-469b-8ea7-4ac3b0fb9990	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	23b90e7e-3cf9-47f5-8a76-84b51d261eb9	aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	fee	t	2025-07-01 22:02:33.637755+00	2025-07-01 22:02:33.637755+00
2a3ad294-29b8-4505-97bb-646223ef222e	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	cc538c70-c9ec-439d-a3f4-d9eb5a6f1ad1	aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	revenue	t	2025-07-01 22:02:33.637755+00	2025-07-01 22:02:33.637755+00
725374b3-d1f4-4f83-8f2c-a712eef0311b	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	182d9a1a-890c-4bfc-900a-2608b9eebbfb	aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	expense	t	2025-07-01 22:02:33.637755+00	2025-07-01 22:02:33.637755+00
7fbf9676-dba4-4ee4-9488-6f444aeba089	635844ab-029a-43f8-8523-d7882915266a	agency_banking_float	ce880a95-07c8-40b8-8cf0-1fc4999ca783	aece4b19-d8e9-4d99-bc52-a8c12bc72eb2	commission	t	2025-07-01 22:02:33.637755+00	2025-07-01 22:02:33.637755+00
f2c0247f-5abf-437f-9580-47353431ca2c	635844ab-029a-43f8-8523-d7882915266a	power_float	d8e90e8e-a3ac-423a-be66-561dc65bb651	2fe947a8-c85f-42b8-9aff-c85bc4439484	fee	t	2025-07-01 22:02:33.86046+00	2025-07-01 22:02:33.86046+00
dd7ac15f-a42f-48c5-9463-f83b5ebf8d48	635844ab-029a-43f8-8523-d7882915266a	power_float	d4f2a849-140d-4e4b-a356-6251774da202	2fe947a8-c85f-42b8-9aff-c85bc4439484	revenue	t	2025-07-01 22:02:33.86046+00	2025-07-01 22:02:33.86046+00
5df07d4c-7017-42f0-994c-c101c0974afb	635844ab-029a-43f8-8523-d7882915266a	power_float	53106340-7c18-4f7d-ac41-1024a465c8fe	2fe947a8-c85f-42b8-9aff-c85bc4439484	expense	t	2025-07-01 22:02:33.86046+00	2025-07-01 22:02:33.86046+00
14be4c48-3330-4fd3-9689-03d5664a23be	635844ab-029a-43f8-8523-d7882915266a	power_float	45454d3e-cb91-4804-b9cc-973fd2ab9003	2fe947a8-c85f-42b8-9aff-c85bc4439484	commission	t	2025-07-01 22:02:33.86046+00	2025-07-01 22:02:33.86046+00
d3e559ee-adc0-4307-97a7-8c93f9a5e7f6	635844ab-029a-43f8-8523-d7882915266a	power_float	b1c2f3d4-6993-4287-81ef-00965c21fd20	d1a2470c-3528-426e-afd5-b40d0f2ba9ca	fee	t	2025-07-01 22:02:34.101588+00	2025-07-01 22:02:34.101588+00
9a3d92a4-bc1b-407b-b7dd-677923cf77a1	635844ab-029a-43f8-8523-d7882915266a	power_float	b0c0c93c-5255-464d-88c2-6e2f6fa53045	d1a2470c-3528-426e-afd5-b40d0f2ba9ca	revenue	t	2025-07-01 22:02:34.101588+00	2025-07-01 22:02:34.101588+00
6a6efe03-3a92-43dc-8f4d-4514035ffae1	635844ab-029a-43f8-8523-d7882915266a	power_float	77b8a654-b64a-4fb1-a38a-5c4339c6b71b	d1a2470c-3528-426e-afd5-b40d0f2ba9ca	expense	t	2025-07-01 22:02:34.101588+00	2025-07-01 22:02:34.101588+00
883413bc-ebd9-4841-9a43-cdb3b89d8f73	635844ab-029a-43f8-8523-d7882915266a	power_float	2b4890a3-91f1-4195-b892-7c3eaf1c7371	d1a2470c-3528-426e-afd5-b40d0f2ba9ca	commission	t	2025-07-01 22:02:34.101588+00	2025-07-01 22:02:34.101588+00
\.


--
-- Data for Name: gl_sync_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gl_sync_logs (id, module, operation, status, details, error, created_at) FROM stdin;
\.


--
-- Data for Name: gl_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, created_at, posted_by, posted_at, reversed_by, reversed_at, metadata, reference, amount, transaction_date) FROM stdin;
c561c204-8f96-4633-a658-6d0ac17a8b69	2025-06-22	agency_banking	abt-e8228551	deposit	Agency Banking deposit - Cal Bank - 2464402761018	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 19:23:34.217717+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "2464402761018", "partnerBankCode": "Cal Bank"}	\N	\N	\N
e9712e9c-a1aa-494a-ba74-4216d04b139b	2025-06-22	jumia	POD_1750622151829_253	pod_collection	Jumia pod_collection - 320	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 19:55:59.114484+00	\N	\N	\N	\N	\N	\N	\N	\N
7d90a483-f87d-40de-a03a-84751df55e1e	2025-06-22	jumia	POD_1750622151829_253	pod_collection	Jumia pod_collection - 320	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 19:56:03.475988+00	\N	\N	\N	\N	\N	\N	\N	\N
d9c8c5c2-2a86-466f-870f-14590259017a	2025-06-22	power	4b0940e6-c4e9-4bdb-940b-c584c4d12436	credit	Power sale payment - ECG - PWR-1750622237340 - Meter: 9872938745	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 19:57:25.034329+00	\N	\N	\N	\N	{"debit": 0, "amount": 200, "credit": 200, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
a0568419-cb78-4d05-a233-b2ecf359cabb	2025-06-22	power	4b0940e6-c4e9-4bdb-940b-c584c4d12436	sale	Power sale - ECG - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 19:57:34.977354+00	\N	\N	\N	\N	{"provider": "ecg", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "9872938745", "customer_name": "Salim"}	\N	\N	\N
9d9690a7-9251-4b85-8cc6-901aabb6da30	2025-06-22	power	4b0940e6-c4e9-4bdb-940b-c584c4d12436	sale	Power sale - ECG - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-22 19:57:45.127496+00	\N	\N	\N	\N	{"provider": "ecg", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "9872938745", "customer_name": "Salim"}	\N	\N	\N
f9109dd8-b1a0-49da-9964-89e158f737e7	2025-06-23	agency_banking	abt-da10e1fa	deposit	Agency Banking deposit - Cal Bank - 2464402761018	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-23 20:06:11.365269+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "2464402761018", "partnerBankCode": "Cal Bank"}	\N	\N	\N
d352a257-9a8b-489f-ba1b-a4e34420fe57	2025-06-23	agency_banking	abt-a4e5003f	deposit	Agency Banking deposit - Cal Bank - 298628729202	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-23 20:39:34.947095+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "298628729202", "partnerBankCode": "Cal Bank"}	\N	\N	\N
ed5c74b2-f29c-477d-b8ac-78a6383bf8a5	2025-06-23	agency_banking	abt-cec083ad	interbank	Agency Banking interbank - Cal Bank - 78249248872432	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-23 20:40:55.681983+00	\N	\N	\N	\N	{"fee": 20, "amount": 2000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Abdul Kadir", "accountNumber": "78249248872432", "partnerBankCode": "Cal Bank"}	\N	\N	\N
5b30f171-d49e-4e79-b803-e97805ca3dd6	2025-06-23	jumia	POD_1750713408472_342	pod_collection	Jumia pod_collection - 500	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-23 21:16:58.360433+00	\N	\N	\N	\N	\N	\N	\N	\N
80472277-52e9-40b4-93f9-ae5b35305c76	2025-06-23	jumia	POD_1750713408472_342	pod_collection	Jumia pod_collection - 500	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-23 21:17:06.683391+00	\N	\N	\N	\N	\N	\N	\N	\N
6271e3aa-db10-4aec-a876-eafbf4a03be7	2025-06-23	jumia	POD_1750713486638_658	pod_collection	Jumia pod_collection - 301	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-23 21:18:22.665866+00	\N	\N	\N	\N	\N	\N	\N	\N
c0619eee-76ce-46de-958a-9dd1616829ff	2025-06-24	power	cfd02a2f-b349-4efe-b90c-72ef0e3e0092	credit	Power sale payment - NEDCO - PWR-1750779543814 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 15:39:10.866593+00	\N	\N	\N	\N	{"debit": 0, "amount": 1000, "credit": 1000, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
855ba38e-a137-4a3d-a085-c63ed1cd3fb1	2025-06-24	power	cfd02a2f-b349-4efe-b90c-72ef0e3e0092	sale	Power sale - NEDCO - 1000	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 15:39:23.085717+00	\N	\N	\N	\N	{"provider": "nedco", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED"}	\N	\N	\N
845b3ebd-f311-4c4d-989e-49d2775663d2	2025-06-24	power	bde41781-0178-4b1e-9bf7-e24b6da73325	debit	Power sale - ECG - PWR-1750781961501 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 16:19:25.595337+00	\N	\N	\N	\N	{"debit": 100, "amount": -100, "credit": 0, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "243af67a-1cb7-4e76-a5be-b575a2d41a49", "account_code": "1300-001", "account_name": "Power Inventory", "transaction_type": "debit"}	\N	\N	\N
ffc80c2e-7ec1-4920-8b23-59d5bc8848ff	2025-06-24	power	bde41781-0178-4b1e-9bf7-e24b6da73325	credit	Power sale payment - ECG - PWR-1750781961501 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 16:19:28.107175+00	\N	\N	\N	\N	{"debit": 0, "amount": 100, "credit": 100, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
7ea56bf8-1211-4729-895a-1d614c044cbe	2025-06-24	power	bde41781-0178-4b1e-9bf7-e24b6da73325	sale	Power sale - ECG - 100	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 16:19:40.39089+00	\N	\N	\N	\N	{"provider": "ecg", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Majeed Ayisha"}	\N	\N	\N
d75bb105-4483-452c-9bef-e1a6b6e86451	2025-06-24	power	fa73c750-58d0-4935-b736-6f554c723786	debit	Power sale - NEDCO - PWR-1750792256510 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 19:11:02.100309+00	\N	\N	\N	\N	{"debit": 200, "amount": -200, "credit": 0, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "d1a2470c-3528-426e-afd5-b40d0f2ba9ca", "account_code": "1300-001", "account_name": "Power Inventory", "transaction_type": "debit"}	\N	\N	\N
f819c050-48b5-4f5c-9656-e5ab92253ae0	2025-06-24	power	fa73c750-58d0-4935-b736-6f554c723786	credit	Power sale payment - NEDCO - PWR-1750792256510 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 19:11:05.071052+00	\N	\N	\N	\N	{"debit": 0, "amount": 200, "credit": 200, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
59682657-0cb3-4957-a999-5049e09f32eb	2025-06-24	power	fa73c750-58d0-4935-b736-6f554c723786	sale	Power sale - NEDCO - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 19:11:09.382378+00	\N	\N	\N	\N	{"provider": "nedco", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Jane Smith"}	\N	\N	\N
698a25a8-124c-40af-8cd3-fa84442923c6	2025-06-24	power	fa73c750-58d0-4935-b736-6f554c723786	sale	Power sale - NEDCO - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 19:11:19.437234+00	\N	\N	\N	\N	{"provider": "nedco", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Jane Smith"}	\N	\N	\N
664976c2-6521-45e4-9a27-1fbac7a20e3d	2025-06-24	ezwich_batch	fa2af869-c098-4bff-be70-4c11786cbaed	batch_update	Card batch adjustment: BATCH-1750796137420-KNBW	posted	unknown	2025-06-24 20:16:02.578142+00	\N	\N	\N	\N	\N	\N	\N	\N
d8f27399-92b0-42a4-950c-cdcd5a35cf0b	2025-06-24	ezwich_batch	fa2af869-c098-4bff-be70-4c11786cbaed	batch_delete	Card batch deleted: BATCH-1750796137420-KNBW	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 20:16:36.710776+00	\N	\N	\N	\N	\N	\N	\N	\N
b8a51c85-c678-43a4-a3f8-1d5509bfdec3	2025-06-24	power	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	debit	Power sale - ECG - PWR-1750800674376 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 21:31:20.352078+00	\N	\N	\N	\N	{"debit": 200, "amount": -200, "credit": 0, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "243af67a-1cb7-4e76-a5be-b575a2d41a49", "account_code": "1300-001", "account_name": "Power Inventory", "transaction_type": "debit"}	\N	\N	\N
e1e73a19-7d37-42da-9ad8-2326229ca33d	2025-06-24	power	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	credit	Power sale payment - ECG - PWR-1750800674376 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 21:31:23.694936+00	\N	\N	\N	\N	{"debit": 0, "amount": 200, "credit": 200, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
63314c1b-afac-4fa2-92f3-1e3de6701760	2025-06-24	power	ecf9b3a9-ff58-4f8c-a76d-307020ab3369	sale	Power sale - ECG - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-24 21:31:41.212389+00	\N	\N	\N	\N	{"provider": "ecg", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Salim"}	\N	\N	\N
75af9f96-b0c1-41cc-99e8-98201a8ded48	2025-06-25	jumia	POD_1750850878147_216	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-25 11:28:14.59101+00	\N	\N	\N	\N	\N	\N	\N	\N
992103e6-97a4-4b64-8054-3da70919b90e	2025-06-25	agency_banking	abt-a53762c2	deposit	Agency Banking deposit - GCB - 72982092782233	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-25 15:43:10.568809+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "", "partnerBank": "GCB", "customerName": "Jane Smith", "accountNumber": "72982092782233", "partnerBankCode": "GCB"}	\N	\N	\N
a117c7c6-0a00-48e2-89bf-8a0727f99874	2025-06-26	agency_banking	abt-5f0fa354	deposit	Agency Banking deposit - Cal Bank - 72982092782233	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-26 06:56:22.950608+00	\N	\N	\N	\N	{"fee": 5, "amount": 1000, "reference": "", "partnerBank": "Cal Bank", "customerName": "Jane Smith", "accountNumber": "72982092782233", "partnerBankCode": "Cal Bank"}	\N	\N	\N
810caf71-a6c7-430a-8b9d-df18c926eca9	2025-06-26	jumia	POD_1750921173177_113	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-26 06:59:41.25652+00	\N	\N	\N	\N	\N	\N	\N	\N
ccc29172-c569-490a-9c7b-4d2acbafae60	2025-06-26	agency_banking	abt-45259eb3	deposit	Agency Banking deposit - GCB - 2464402761018	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-26 07:43:13.108674+00	\N	\N	\N	\N	{"fee": 5, "amount": 200, "reference": "", "partnerBank": "GCB", "customerName": "Jane Smith", "accountNumber": "2464402761018", "partnerBankCode": "GCB"}	\N	\N	\N
f861fbaf-f792-4be6-842d-90734d1cb89b	2025-06-26	power	b750fee4-267e-4ccd-876f-e92873fda37a	sale	Power sale - ECG - 100	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-26 15:18:59.362961+00	\N	\N	\N	\N	{"provider": "ecg", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Unknown Customer"}	\N	\N	\N
67a1b187-bf87-479e-a7e6-18e3f90309dc	2025-06-27	agency_banking	abt-608e7da1	deposit	Agency Banking deposit - Fidelity Bank - 298628729202	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 07:29:33.134076+00	\N	\N	\N	\N	{"fee": 5, "amount": 100, "reference": "", "partnerBank": "Fidelity Bank", "customerName": "Salim", "accountNumber": "298628729202", "partnerBankCode": "Fidelity Bank"}	\N	\N	\N
c2285828-147e-4be3-904b-631050c9937a	2025-06-27	power	8af283eb-812e-463d-bb62-7c2ebc75765a	sale	Power sale - VRA - 100	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 07:35:41.639535+00	\N	\N	\N	\N	{"provider": "vra", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Unknown Customer"}	\N	\N	\N
eace486d-6c88-4dac-ae6b-db9901f1b966	2025-06-27	power	58b3c9bd-3561-4bf5-8079-78725ff0ddfb	debit	Power sale - VRA - PWR-2b3987b5-ce0e-4c76-b931-fb09f9def7ab - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 10:35:45.816552+00	\N	\N	\N	\N	{"debit": 200, "amount": -200, "credit": 0, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "2fe947a8-c85f-42b8-9aff-c85bc4439484", "account_code": "1300-001", "account_name": "Power Inventory", "transaction_type": "debit"}	\N	\N	\N
e6f2c09b-ac6d-44ae-8082-9c4454c76fdb	2025-06-27	power	58b3c9bd-3561-4bf5-8079-78725ff0ddfb	credit	Power sale payment - VRA - PWR-2b3987b5-ce0e-4c76-b931-fb09f9def7ab - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 10:35:48.262688+00	\N	\N	\N	\N	{"debit": 0, "amount": 200, "credit": 200, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
da7c8e11-2029-4b96-b55a-ef8689152a6e	2025-06-27	power	3980b683-a3cc-46a7-bb43-f1419deeaf50	credit	Power sale payment - VRA - PWR-3119fb9f-f124-4dd3-a16d-1eb9df32d608 - Meter: 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 11:34:29.263484+00	\N	\N	\N	\N	{"debit": 0, "amount": 100, "credit": 100, "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "account_id": "99cf91d9-dd30-4553-8cb7-f37a1a88e025", "account_code": "1010-001", "account_name": "Cash in Till", "transaction_type": "credit"}	\N	\N	\N
89bbaf4d-f2cd-400a-9b77-4e45006d536d	2025-06-27	power	3980b683-a3cc-46a7-bb43-f1419deeaf50	sale	Power sale - VRA - 100	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 11:34:33.021142+00	\N	\N	\N	\N	{"provider": "vra", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Unknown Customer"}	\N	\N	\N
cb45b9d0-07f7-495b-9dec-4b27661f477d	2025-06-27	momo	6008ceec-bbc7-4484-a0a5-a92351406c60	cash-in	MoMo cash-in - MTN - 0248142134	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 12:07:39.017453+00	\N	\N	\N	\N	{"fee": 0, "amount": 200, "provider": "MTN", "reference": "MOMO-1751026055565", "phoneNumber": "0248142134", "customerName": "Salim"}	\N	\N	\N
97e03915-de28-4434-821e-e37b4a49caee	2025-06-27	momo	cdad6611-be88-4bcf-b2b8-43317405ced0	cash-out	MoMo cash-out - Vodafone - 0240388114 - Jane Smith	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 16:26:00.358325+00	\N	\N	\N	\N	{"fee": 2, "amount": 200, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751041559664", "branch_name": "Hill Top Branch", "phone_number": "0240388114", "customer_name": "Jane Smith", "transaction_id": "cdad6611-be88-4bcf-b2b8-43317405ced0"}	MOMO-1751041559664	202	2025-06-27
c9805eeb-0617-46fc-ac00-ce12802ad569	2025-06-27	momo	f6e32fc9-26ef-42b5-91c5-1539a4321203	cash-in	MoMo cash-in - Vodafone - 0547910720 - Abdul Aziz	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 16:42:48.208617+00	\N	\N	\N	\N	{"fee": 0, "amount": 212, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751042567428", "branch_name": "Hill Top Branch", "phone_number": "0547910720", "customer_name": "Abdul Aziz", "transaction_id": "f6e32fc9-26ef-42b5-91c5-1539a4321203"}	MOMO-1751042567428	212	2025-06-27
773b9e64-5cd8-490f-84f3-efb310b3edf1	2025-06-27	momo	fe6abbd2-8147-4123-a429-ea9e0093f564	cash-in	MoMo cash-in - Vodafone - 5027599206 - MOHAMMED SALIM ABDUL-MAJEED	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 16:53:51.106882+00	\N	\N	\N	\N	{"fee": 0, "amount": 100, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751043230415", "branch_name": "Hill Top Branch", "phone_number": "5027599206", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "transaction_id": "fe6abbd2-8147-4123-a429-ea9e0093f564"}	MOMO-1751043230415	100	2025-06-27
76ed6d1c-559c-4fcd-809a-88a4316ef9a5	2025-06-27	momo	eaeba21a-ca46-4bb4-8f65-64bf80271116	cash-in	MoMo cash-in - Vodafone - 0554899202 - Jane Smith	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 19:11:48.922022+00	\N	\N	\N	\N	{"fee": 10, "amount": 100, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751051507393", "branch_name": "Hill Top Branch", "phone_number": "0554899202", "customer_name": "Jane Smith", "transaction_id": "eaeba21a-ca46-4bb4-8f65-64bf80271116"}	MOMO-1751051507393	110	2025-06-27
b293cf56-79ef-45f8-aea6-e1d6fba431c3	2025-06-27	momo	6de255f0-22ae-4913-9c47-7f7a7f35db04	cash-out	MoMo cash-out - Vodafone - 0248142134 - Salim	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-27 19:20:56.360126+00	\N	\N	\N	\N	{"fee": 5, "amount": 1000, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751052054665", "branch_name": "Hill Top Branch", "phone_number": "0248142134", "customer_name": "Salim", "transaction_id": "6de255f0-22ae-4913-9c47-7f7a7f35db04"}	MOMO-1751052054665	1005	2025-06-27
ae9e6c0f-41f9-4d34-9289-3909b41a1d5d	2025-06-28	momo	4d493752-58c8-4cac-886c-63b54ff0fadd	cash-in	MoMo cash-in - Vodafone - 5027599206 - MOHAMMED SALIM ABDUL-MAJEED	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 00:18:15.655554+00	\N	\N	\N	\N	{"fee": 0, "amount": 200, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751069892735", "branch_name": "Hill Top Branch", "phone_number": "5027599206", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "transaction_id": "4d493752-58c8-4cac-886c-63b54ff0fadd"}	MOMO-1751069892735	200	2025-06-28
560e668c-3918-403d-b772-1778f2522a92	2025-06-28	momo	a7638c08-dfac-45a9-afde-78e5099bdebb	cash-in	MoMo cash-in - Vodafone - 0549514616 - Jane Smith	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 09:33:59.944679+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "source": "momo", "provider": "Vodafone", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751103236692", "branch_name": "Hill Top Branch", "phone_number": "0549514616", "customer_name": "Jane Smith", "transaction_id": "a7638c08-dfac-45a9-afde-78e5099bdebb"}	MOMO-1751103236692	1000	2025-06-28
fca50d88-070c-4b61-951f-0652f70280a3	2025-06-28	momo	81c1fbc6-ead4-4ef6-96a8-97c33ff6065f	cash-out	MoMo cash-out - Z-Pay - 0547910720 - MOHAMMED SALIM ABDUL-MAJEED	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 09:53:20.909493+00	\N	\N	\N	\N	{"fee": 2, "amount": 200, "source": "momo", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751104397542", "branch_name": "Hill Top Branch", "phone_number": "0547910720", "customer_name": "MOHAMMED SALIM ABDUL-MAJEED", "transaction_id": "81c1fbc6-ead4-4ef6-96a8-97c33ff6065f"}	MOMO-1751104397542	202	2025-06-28
6a8206d5-559b-41b0-881a-d4723353dd88	2025-06-28	momo	e63f2d32-c0ec-463c-972b-4cdea44f7ea1	cash-in	MoMo cash-in - Z-Pay - 5027599206 - Jane Smith	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 11:08:20.166594+00	\N	\N	\N	\N	{"fee": 0, "amount": 200, "source": "momo", "provider": "Z-Pay", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751108896862", "branch_name": "Hill Top Branch", "phone_number": "5027599206", "customer_name": "Jane Smith", "transaction_id": "e63f2d32-c0ec-463c-972b-4cdea44f7ea1"}	MOMO-1751108896862	200	2025-06-28
59c0ea5a-caaf-4ea3-8f65-3af1b0cdac17	2025-06-28	momo	f5afc758-2eee-4f6d-ab92-c7804932e7c6	cash-in	MoMo cash-in - MTN - 0547910720 - Ibrahim Hardi	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 11:23:15.081892+00	\N	\N	\N	\N	{"fee": 0, "amount": 200, "source": "momo", "provider": "MTN", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751109791782", "branch_name": "Hill Top Branch", "phone_number": "0547910720", "customer_name": "Ibrahim Hardi", "transaction_id": "f5afc758-2eee-4f6d-ab92-c7804932e7c6"}	MOMO-1751109791782	200	2025-06-28
fbd56793-0612-4a47-81a4-73d70d6d1e98	2025-06-28	ezwich	eccbe748-c996-4982-88e5-1d993cc852fd	withdrawal	E-Zwich withdrawal - Jane Smith	posted	programmingwithsalim@gmail.com	2025-06-28 12:26:04.007067+00	\N	\N	\N	\N	{"fee": 7, "type": "withdrawal", "amount": 700, "source": "ezwich", "provider": "GCB", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "EZW-WITHDRAWAL-1751113562110", "branch_name": "Unknown Branch", "card_number": "00006", "customer_name": "Jane Smith", "transaction_id": "eccbe748-c996-4982-88e5-1d993cc852fd"}	EZW-WITHDRAWAL-1751113562110	707	2025-06-28
97553a86-7d78-42c3-9a95-a9aefd3e183e	2025-06-28	jumia	POD_1751113717952_528	pod_collection	Jumia pod_collection - 2000	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 12:28:51.318593+00	\N	\N	\N	\N	\N	\N	\N	\N
e26a215d-cd83-4c6b-a83d-d56488baabd6	2025-06-28	jumia	POD_1751113717952_528	pod_collection	Jumia pod_collection - 2000	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 12:29:01.64297+00	\N	\N	\N	\N	\N	\N	\N	\N
f28e56d6-0f97-49cf-959a-1b2db2837441	2025-06-28	agency_banking	abt-0198a3ba	withdrawal	Agency Banking withdrawal - Fidelity Bank - 72982092782233	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 12:42:14.818209+00	\N	\N	\N	\N	{"fee": 10, "amount": 4000, "reference": "AGENCY-1751114527995", "partnerBank": "Fidelity Bank", "customerName": "MOHAMMED SALIM ABDUL-MAJEED", "accountNumber": "72982092782233", "partnerBankCode": ""}	\N	\N	\N
a7fa570c-5c25-44a5-901a-6ef11c9b4427	2025-06-28	power	95962dc1-1c3d-4086-809a-006c289a8746	sale	Power sale - VRA - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 12:43:14.003673+00	\N	\N	\N	\N	{"provider": "vra", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "meter_number": "6546545", "customer_name": "Unknown Customer"}	\N	\N	\N
d4860152-50b0-4b9f-ba78-26a2f8bcd253	2025-06-28	agency_banking	abt-83488e8e	withdrawal	Agency Banking withdrawal - Ecobank - 39873285745245	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 20:48:05.946543+00	\N	\N	\N	\N	{"fee": 0, "amount": 200, "reference": "AGENCY-1751143684934", "partnerBank": "Ecobank", "customerName": "Abdul", "accountNumber": "39873285745245", "partnerBankCode": ""}	\N	\N	\N
b00ed7d0-f19c-4194-8fb3-1d675597782e	2025-06-28	jumia	POD_1751144483590_756	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 21:01:34.7759+00	\N	\N	\N	\N	\N	\N	\N	\N
efcc24e6-237e-4171-a16e-d495c0afefa2	2025-06-28	jumia	POD_1751144483590_756	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-28 21:01:46.609022+00	\N	\N	\N	\N	\N	\N	\N	\N
818bb198-0041-436a-96d2-3c0eba1a6a21	2025-06-29	momo	d8e80031-d9ea-4ebf-9a00-a209a5b43211	cash-out	MoMo cash-out - Vodafone - 0202373647	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 13:13:28.222422+00	\N	\N	\N	\N	{"fee": 0, "amount": 300, "provider": "Vodafone", "reference": "MOMO-1751202803021", "phoneNumber": "0202373647", "customerName": "Mohammed Razak"}	\N	\N	\N
fdf517a9-1381-49b8-ae8a-e1c9e0f28e1c	2025-06-29	momo	190578d6-7463-4bc0-bec9-f0327e0a97ad	cash-out	MoMo cash-out - Vodafone - 0236873537	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 13:14:26.740628+00	\N	\N	\N	\N	{"fee": 10, "amount": 1000, "provider": "Vodafone", "reference": "MOMO-1751202861887", "phoneNumber": "0236873537", "customerName": "Musah"}	\N	\N	\N
c45f3d2f-ec5e-4d05-bca7-6b1c74492321	2025-06-29	agency_banking	86674f96	withdrawal	Agency Banking withdrawal - GCB - 56374674567567	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 13:15:36.019307+00	\N	\N	\N	\N	{"fee": 30, "amount": 3000, "reference": "AGENCY-1751202935376", "partnerBank": "GCB", "customerName": "gsgsfg", "accountNumber": "56374674567567", "partnerBankCode": ""}	\N	\N	\N
58fd290a-7847-4024-bf11-ab09ac68703a	2025-06-29	momo	51717e8b-bb71-468e-829e-7829b8802f4a	cash-out	MoMo cash-out - Vodafone - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 13:32:54.793879+00	\N	\N	\N	\N	{"fee": 10, "amount": 1000, "provider": "Vodafone", "reference": "MOMO-1751203969395", "phoneNumber": "0549514616", "customerName": "sdfgsfdgsdfg"}	\N	\N	\N
71b9148f-2589-4cf7-979c-94414b568cd1	2025-06-29	ezwich	02e5c4f7-3a60-455e-b6f4-a30375d22c17	withdrawal	E-Zwich withdrawal - Suadik	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 13:34:08.084108+00	\N	\N	\N	\N	{"fee": 0, "type": "withdrawal", "amount": 200, "source": "ezwich", "provider": "GCB", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "EZW-WITHDRAWAL-1751204046957", "branch_name": "Unknown Branch", "card_number": "78623658", "customer_name": "Suadik", "transaction_id": "02e5c4f7-3a60-455e-b6f4-a30375d22c17"}	EZW-WITHDRAWAL-1751204046957	200	2025-06-29
b2311296-50b4-44c3-ad5f-850789f8abe2	2025-06-29	momo	65deded1-690e-41a7-8da4-36f2d8ee2cb3	cash-in	MoMo cash-in - Vodafone - 0234876882	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 14:36:26.653847+00	\N	\N	\N	\N	{"fee": 10, "amount": 1000, "provider": "Vodafone", "reference": "MOMO-1751207780515", "phoneNumber": "0234876882", "customerName": "Hudu Abdulai"}	\N	\N	\N
6dcd338d-f5de-4a6a-b561-77f5e05eab96	2025-06-29	jumia	POD_1751232043939_445	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-29 21:20:54.1796+00	\N	\N	\N	\N	\N	\N	\N	\N
6925cb12-c03e-4b0b-bdc6-987d4d2cfd70	2025-06-29	momo	8fdf7489-d216-4de9-b159-bb3b98ecc01d-reversal-1751234084459	cash-in	MoMo cash-in - Vodafone - 0549514616	posted	system	2025-06-29 21:54:48.21465+00	\N	\N	\N	\N	{"fee": 0, "amount": 2000, "provider": "Vodafone", "reference": "Reversal for edit: MOMO-1751218950971", "phoneNumber": "0549514616", "customerName": "hasdjfkh"}	\N	\N	\N
9df3265d-f71d-4220-aa16-91483c0a71c0	2025-06-30	momo	1751278227772-397	cash-in	MoMo cash-in - MTN - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 10:10:30.628671+00	\N	\N	\N	\N	{"fee": 0, "amount": 400, "provider": "MTN", "reference": "MOMO-1751278227710", "phoneNumber": "0549514616", "customerName": "LAJDLFKSJ"}	\N	\N	\N
d85b28b3-bba8-4cf0-b1bf-b93a2710b38c	2025-06-30	momo	1c92b2e6-9775-4fd1-b922-1e3c7e116f58-updated-1751278265772	cash-in	MoMo cash-in - MTN - 0549514616	posted	system	2025-06-30 10:11:07.440261+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "provider": "MTN", "reference": "MOMO-1751278227710", "phoneNumber": "0549514616", "customerName": "LAJDLFKSJ"}	\N	\N	\N
56457f2a-ee72-4742-a9f6-376532236e49	2025-06-30	agency_banking	73d7e500	deposit	Agency Banking deposit - GCB - 9827359827495	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 10:13:06.755512+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "AGENCY-1751278386985", "partnerBank": "GCB", "customerName": "alfkjalskdjf", "accountNumber": "9827359827495", "partnerBankCode": ""}	\N	\N	\N
7aa648b6-6e7a-423c-9371-11219b58f258	2025-06-30	momo	1751280075693-644	cash-out	MoMo cash-out - MTN - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 10:41:18.495318+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "provider": "MTN", "reference": "MOMO-1751280075614", "phoneNumber": "0549514616", "customerName": "klhjlkjh"}	\N	\N	\N
fa58e857-1a25-40ce-9865-9ec731f12278	2025-06-30	momo	1751284447346-989	cash-in	MoMo cash-in - Vodafone - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 11:54:25.906555+00	\N	\N	\N	\N	{"fee": 10, "amount": 1000, "provider": "Vodafone", "reference": "MOMO-1751284447292", "phoneNumber": "0549514616", "customerName": "saldkfalksd"}	\N	\N	\N
dfa01947-358e-4265-887b-c29b71adc7f8	2025-06-30	agency_banking	2fe4cda6	deposit	Agency Banking deposit - GCB - 72983479578234	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 13:27:52.409816+00	\N	\N	\N	\N	{"fee": 10, "amount": 1000, "reference": "AGENCY-1751290072864", "partnerBank": "GCB", "customerName": "sdlaksjdf", "accountNumber": "72983479578234", "partnerBankCode": ""}	\N	\N	\N
7b1c3b93-f65e-401a-ba7d-d013fc01efaa	2025-06-30	agency_banking	9c7719a0	withdrawal	Agency Banking withdrawal - Fidelity - 98479258734	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 13:59:56.869522+00	\N	\N	\N	\N	{"fee": 0, "amount": 484.21, "reference": "AGENCY-1751291997369", "partnerBank": "Fidelity", "customerName": "alsdjflkj", "accountNumber": "98479258734", "partnerBankCode": ""}	\N	\N	\N
fd9c15a7-f3b0-47c0-86e7-c8561e24e18b	2025-06-30	agency_banking	9661dc26	withdrawal	Agency Banking withdrawal - Fidelity - 98048379382574	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:00:47.587875+00	\N	\N	\N	\N	{"fee": 0, "amount": 600, "reference": "AGENCY-1751292048097", "partnerBank": "Fidelity", "customerName": "ladslfjk", "accountNumber": "98048379382574", "partnerBankCode": ""}	\N	\N	\N
e6e30264-019d-4517-a3c1-bde93a813642	2025-06-30	agency_banking	04c79b20	withdrawal	Agency Banking withdrawal - Fidelity - 98273459872345	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:04:40.520094+00	\N	\N	\N	\N	{"fee": 0, "amount": 484.21, "reference": "AGENCY-1751292281037", "partnerBank": "Fidelity", "customerName": "kljflajksdf", "accountNumber": "98273459872345", "partnerBankCode": ""}	\N	\N	\N
e1339879-6f1c-4756-9742-16b102f0e45e	2025-06-30	momo	827adb53-d950-416c-a10d-b50d7bbf4740	cash-in	MoMo cash-in - MTN - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:11:03.674491+00	\N	\N	\N	\N	{"fee": 0, "amount": 500, "provider": "MTN", "reference": "MOMO-1751292659413", "phoneNumber": "0549514616", "customerName": "Mohammed"}	\N	\N	\N
6551c36a-bf0c-4080-8504-3ea2f88ab072	2025-06-30	momo	09671843-e5f3-4bd2-a6de-34aaa3b653ba	cash-out	MoMo cash-out - MTN - 0245879635	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:11:38.309207+00	\N	\N	\N	\N	{"fee": 0, "amount": 500, "provider": "MTN", "reference": "MOMO-1751292695301", "phoneNumber": "0245879635", "customerName": "llkdjlfkjasd"}	\N	\N	\N
a8381e23-a237-4451-83f1-4535b7f1ecd7	2025-06-30	momo	b92a6ae2-6b2d-4797-a04c-1e9ca0b6151d	cash-in	MoMo cash-in - MTN - 0245879654	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:16:15.956935+00	\N	\N	\N	\N	{"fee": 0, "amount": 500, "provider": "MTN", "reference": "MOMO-1751292967634", "phoneNumber": "0245879654", "customerName": "kajsldkfjsa"}	\N	\N	\N
a3ab6208-65ab-4530-a3a3-f7adf971b87f	2025-06-30	agency_banking	1a8c9c3c	withdrawal	Agency Banking withdrawal - GCB - 279458273495	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:26:23.591423+00	\N	\N	\N	\N	{"fee": 0, "amount": 3000, "reference": "AGENCY-1751293584136", "partnerBank": "GCB", "customerName": "akjsdlfjsd", "accountNumber": "279458273495", "partnerBankCode": ""}	\N	\N	\N
dda37a69-3aa1-4968-a410-2ff563b575dc	2025-06-30	agency_banking	bd629eb0	deposit	Agency Banking deposit - GCB - 93274592834758	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:27:12.356758+00	\N	\N	\N	\N	{"fee": 0, "amount": 3000, "reference": "AGENCY-1751293632898", "partnerBank": "GCB", "customerName": "LJHLSKDAF LKASJD", "accountNumber": "93274592834758", "partnerBankCode": ""}	\N	\N	\N
db07bc91-6e11-437a-a669-23cd50b5145e	2025-06-30	agency_banking	5e7bd0e2	withdrawal	Agency Banking withdrawal - GCB - 2973495873434	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:35:50.058234+00	\N	\N	\N	\N	{"fee": 0, "amount": 3000, "reference": "AGENCY-1751294150603", "partnerBank": "GCB", "customerName": "jalksdjflkjsd", "accountNumber": "2973495873434", "partnerBankCode": ""}	\N	\N	\N
fb5cdb4b-c6ce-4dd6-861c-9552568f9582	2025-06-30	agency_banking	9001a683	withdrawal	Agency Banking withdrawal - GCB - 27984739843485	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 14:39:06.275133+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "AGENCY-1751294346833", "partnerBank": "GCB", "customerName": "jlksjfglkfdg", "accountNumber": "27984739843485", "partnerBankCode": ""}	\N	\N	\N
62ff46e3-7e2c-47c0-af23-1de044b29eec	2025-06-30	agency_banking	bcad027a	interbank	Agency Banking interbank - GCB - 983274958734	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 15:15:44.787408+00	\N	\N	\N	\N	{"fee": 0, "amount": 1000, "reference": "AGENCY-1751296545368", "partnerBank": "GCB", "customerName": "llajs lkajsdlfkj", "accountNumber": "983274958734", "partnerBankCode": ""}	\N	\N	\N
61794bfc-97bd-44b1-9130-8caf2fa70ddd	2025-06-30	ezwich	ac8a6554-67e9-47d9-92b6-f4ae29f98079	withdrawal	E-Zwich withdrawal - dhfkajsfh	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 21:49:06.92246+00	\N	\N	\N	\N	{"fee": 10, "type": "withdrawal", "amount": 100, "source": "ezwich", "provider": "GHIPPS", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "EZW-WITHDRAWAL-1751309489272", "branch_name": "Unknown Branch", "card_number": "4875278554", "customer_name": "dhfkajsfh", "transaction_id": "ac8a6554-67e9-47d9-92b6-f4ae29f98079"}	EZW-WITHDRAWAL-1751309489272	110	2025-06-30
b6c9499d-d65b-424e-baa1-639d8cbd97ad	2025-06-30	ezwich	44216b89-d063-4cd8-8fc2-2861c103433c	withdrawal	E-Zwich withdrawal - Mohammed Salim	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-06-30 22:05:36.997947+00	\N	\N	\N	\N	{"fee": 50, "type": "withdrawal", "amount": 500, "source": "ezwich", "provider": "GHIPPS", "branch_id": "635844ab-029a-43f8-8523-d7882915266a", "reference": "EZW-WITHDRAWAL-1751310478799", "branch_name": "Unknown Branch", "card_number": "2361748623", "customer_name": "Mohammed Salim", "transaction_id": "44216b89-d063-4cd8-8fc2-2861c103433c"}	EZW-WITHDRAWAL-1751310478799	550	2025-06-30
6d4329f1-5efb-4c92-99a2-84a1fd816bf3	2025-07-01	power	pwr_1751378510232_ztewll9lo	bill_payment	Power bill payment - 2fe947a8-c85f-42b8-9aff-c85bc4439484 - 9379472845	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 14:01:56.338947+00	\N	\N	\N	\N	{"amount": 100, "provider": "2fe947a8-c85f-42b8-9aff-c85bc4439484", "meterNumber": "9379472845", "customerName": "Majeed Ayisha"}	\N	\N	\N
b3119f2c-70d1-49ba-93c2-c83cc2678bc8	2025-07-01	power	pwr_1751380158012_q0zwitftx	bill_payment	Power bill payment - NEDCo - 829527345	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 14:29:19.012498+00	\N	\N	\N	\N	{"amount": 200, "provider": "NEDCo", "meterNumber": "829527345", "customerName": "ABUBAKARI ABDUL-MAJEED"}	\N	\N	\N
da0b0eee-7a2f-4d85-8ebb-8f0a5d0224eb	2025-07-01	power	pwr_1751382007189_92x53l2xq	bill_payment	Power bill payment - NEDCo - 29072384	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 15:00:08.153637+00	\N	\N	\N	\N	{"amount": 200, "provider": "NEDCo", "meterNumber": "29072384", "customerName": "Mohammed Salim Abdul-Majeed"}	\N	\N	\N
68a9f3df-f53d-4b84-83e3-db256b80e3d5	2025-07-01	power	pwr_1751389601345_38j293smh	bill_payment	Power bill payment - NEDCo - 97328739245	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 17:06:42.812903+00	\N	\N	\N	\N	{"amount": 100, "provider": "NEDCo", "meterNumber": "97328739245", "customerName": "Ibrahim Hardi"}	\N	\N	\N
981aa2fa-a9e6-4e21-831c-d958937bddb2	2025-07-01	jumia	POD_1751401067225_586	pod_collection	Jumia pod_collection - 100	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:17:53.115866+00	\N	\N	\N	\N	\N	\N	\N	\N
d6096155-084d-423b-b116-3922e2ccab63	2025-07-01	jumia	POD_1751401067225_586	pod_collection	Jumia pod_collection - 100	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:17:57.790349+00	\N	\N	\N	\N	\N	\N	\N	\N
5f2272e8-4184-46db-b6af-719dac7c54f6	2025-07-01	power	pwr_1751401846123_vqr4pzbse	bill_payment	Power bill payment - NEDCo - 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:30:47.849134+00	\N	\N	\N	\N	{"amount": 786, "provider": "NEDCo", "meterNumber": "6546545", "customerName": "Salim"}	\N	\N	\N
aadf019e-a052-4b26-9fa3-a1ee1c369b4b	2025-07-01	power	pwr_1751401877152_vyxburnhw	bill_payment	Power bill payment - ECG - 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:31:19.029197+00	\N	\N	\N	\N	{"amount": 300, "provider": "ECG", "meterNumber": "6546545", "customerName": "Salim"}	\N	\N	\N
82319ae6-4c14-4be9-9d10-fb58913fe94b	2025-07-01	jumia	POD_1751401972871_772	pod_collection	Jumia pod_collection - 2000	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:33:03.933674+00	\N	\N	\N	\N	\N	\N	\N	\N
fa994fb0-ab20-498a-87a6-efa774ead935	2025-07-01	power	pwr_1751402530251_9le9u6s1p	bill_payment	Power bill payment - ECG - 6546545	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:42:11.886123+00	\N	\N	\N	\N	{"amount": 400, "provider": "ECG", "meterNumber": "6546545", "customerName": "Jane Smith"}	\N	\N	\N
84d9dd29-00e5-48e1-8f9c-8d132f0f6fd8	2025-07-01	jumia	POD_1751402748658_110	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:46:01.302264+00	\N	\N	\N	\N	\N	\N	\N	\N
acc425ec-6a64-4734-88b5-e4cd08dc6b36	2025-07-01	jumia	POD_1751402748658_110	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 20:46:07.367147+00	\N	\N	\N	\N	\N	\N	\N	\N
f57d6e91-3c43-4801-b30b-a2d16b6cfff8	2025-07-01	jumia	POD_1751403959850_377	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 21:06:07.89638+00	\N	\N	\N	\N	\N	\N	\N	\N
ddc9c7b7-9263-48e2-bada-20fa62b49a65	2025-07-01	jumia	POD_1751403959850_377	pod_collection	Jumia pod_collection - 200	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-01 21:06:13.475158+00	\N	\N	\N	\N	\N	\N	\N	\N
83dddcc4-9f4b-412d-a16e-f1d014752985	2025-07-02	momo	69462602-f39a-4607-99e8-d223d659072f	cash-in	MoMo cash-in - MTN - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-02 11:41:07.733257+00	\N	\N	\N	\N	{"fee": 20, "amount": 500, "provider": "MTN", "reference": "MOMO-1751456462963", "phoneNumber": "0549514616", "customerName": "Mohammed Salim"}	\N	\N	\N
e8fc2f73-05c8-4e5c-86e0-e2ef514455de	2025-07-02	momo	1fb9474a-6bbc-4315-ab2d-3d6000aed222	cash-in	MoMo cash-in - MTN - 0549514616	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-02 11:58:49.408936+00	\N	\N	\N	\N	{"fee": 20, "amount": 500, "provider": "MTN", "reference": "MOMO-1751457523763", "phoneNumber": "0549514616", "customerName": "Mohammed Salim"}	\N	\N	\N
921b6aae-8066-4889-a355-84e82847384f	2025-07-02	momo	84896d86-19d8-49d7-aa7a-2f88e0b4302e	cash-out	MOMO-1751461238005	posted	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	2025-07-02 13:00:40.868678+00	\N	\N	\N	\N	{}	\N	\N	\N
60753b6e-27e0-4343-9cd9-68017ad790e9	2025-07-02	momo	84896d86-19d8-49d7-aa7a-2f88e0b4302e-deletion-1751461586789	cash-in	MoMo cash-in - MTN - 0549514616	posted	system	2025-07-02 13:06:30.505621+00	\N	\N	\N	\N	{"fee": 20, "amount": 500, "provider": "MTN", "reference": "Deletion reversal: MOMO-1751461238005", "phoneNumber": "0549514616", "customerName": "Mohammed Salim"}	\N	\N	\N
\.


--
-- Data for Name: jumia_liability; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.jumia_liability (id, branch_id, amount, last_updated) FROM stdin;
58	635844ab-029a-43f8-8523-d7882915266a	4700.00	2025-07-01 21:06:05.079151
\.


--
-- Data for Name: jumia_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.jumia_transactions (id, transaction_id, branch_id, user_id, transaction_type, tracking_id, customer_name, customer_phone, amount, settlement_reference, settlement_from_date, settlement_to_date, status, delivery_status, notes, created_at, updated_at, float_account_id, fee) FROM stdin;
66	PAC_1750622110523_616	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	package_receipt	23452345345234	Jane Smith	5027599206	0.00	\N	\N	\N	received	\N	\N	2025-06-22 19:55:11.079387	2025-06-22 19:55:11.079387	\N	\N
70	PAC_1750850666007_501	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	package_receipt	29837945	Mohammed Salim	0246578546	0.00	\N	\N	\N	received	\N	\N	2025-06-25 11:24:27.162375	2025-06-25 11:24:27.162375	\N	\N
73	PAC_1751009870238_273	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	package_receipt	72374895	Jane Smith	0554899202	0.00	\N	\N	\N	received	\N	Customer pickup was late	2025-06-27 07:37:50.097443	2025-06-27 07:37:50.097443	\N	\N
74	SET_1751009950766_734	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	settlement	\N	\N	\N	1521.00	9032434	2025-06-20	2025-06-27	completed	\N	| Paid from: cash-in-till - Unknown Provider (GHS 109495.51)	2025-06-27 07:39:10.604901	2025-06-27 07:39:10.604901	99cf91d9-dd30-4553-8cb7-f37a1a88e025	\N
67	POD_1750622151829_253	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	92394857	Jane Smith	0554899202	320.00	\N	\N	\N	settled	delivered	\N	2025-06-22 19:55:52.547014	2025-06-27 07:39:10.996347	0c6320ae-fb6c-408e-8cfa-934d6d253087	\N
68	POD_1750713408472_342	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	6298734798298	Abdul Razak	0236987562	500.00	\N	\N	\N	settled	delivered	\N	2025-06-23 21:16:49.716658	2025-06-27 07:39:10.996347	0c6320ae-fb6c-408e-8cfa-934d6d253087	\N
69	POD_1750713486638_658	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	729348598734	Mohammed Hassen	0240388114	301.00	\N	\N	\N	settled	delivered	\N	2025-06-23 21:18:08.242427	2025-06-27 07:39:10.996347	\N	\N
71	POD_1750850878147_216	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	9832475845	Abu Sadik	0236578941	200.00	\N	\N	\N	settled	delivered	\N	2025-06-25 11:27:59.284596	2025-06-27 07:39:10.996347	\N	\N
72	POD_1750921173177_113	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	795235794	Mubaraka	0235789654	200.00	\N	\N	\N	settled	delivered	\N	2025-06-26 06:59:33.895652	2025-06-27 07:39:10.996347	\N	\N
75	POD_1751113717952_528	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	#8974-0234	Jane Smith	0549514616	2000.00	\N	\N	\N	active	delivered	\N	2025-06-28 12:28:39.623092	2025-06-28 12:28:39.623092	\N	\N
77	POD_1751144483590_756	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	9298753453	Moammeds ksds	0236287234	200.00	\N	\N	\N	\N	delivered	\N	2025-06-28 21:01:23.949665	2025-06-28 21:01:23.949665	\N	\N
79	PAC_1751401027132_518	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	package_receipt	27894759847	jdlahf	78648254	0.00	\N	\N	\N	\N	\N	\N	2025-07-01 20:17:07.989529	2025-07-01 20:17:07.989529	\N	\N
80	POD_1751401067225_586	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	Y8273423	Mohammed	0336723783	100.00	\N	\N	\N	\N	delivered	\N	2025-07-01 20:17:48.190645	2025-07-01 20:17:48.190645	\N	\N
81	PAC_1751401942101_220	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	package_receipt	KJOI34Y8	Abdul	5098943052	0.00	\N	\N	\N	\N	\N	\N	2025-07-01 20:32:23.198604	2025-07-01 20:32:23.198604	\N	\N
82	POD_1751401972871_772	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	72698538945	kasldf	8902425834	2000.00	\N	\N	\N	\N	delivered	\N	2025-07-01 20:32:53.911617	2025-07-01 20:32:53.911617	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	\N
83	POD_1751402748658_110	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	34234524	asafsfa	5464674567	200.00	\N	\N	\N	\N	delivered	\N	2025-07-01 20:45:55.81385	2025-07-01 20:45:55.81385	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	\N
84	PAC_1751402802329_91	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	package_receipt	363452345	asdfasdfsdf	4745674674567	0.00	\N	\N	\N	\N	\N	\N	2025-07-01 20:46:43.782063	2025-07-01 20:46:43.782063	\N	\N
85	POD_1751403959850_377	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	pod_collection	23422525	dvdfasdfasdf	47456745675	200.00	\N	\N	\N	\N	delivered	\N	2025-07-01 21:06:02.383026	2025-07-01 21:06:02.383026	49f9aec4-8c95-42a9-b9d2-7a2688d0096c	\N
\.


--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.login_attempts (id, email, ip_address, user_agent, success, failure_reason, "timestamp") FROM stdin;
3e193d18-280d-46dc-82fa-851fac155deb	programmingwithsalim@gmail.com	Unknown	Unknown	t	\N	2025-06-28 17:25:19.817522
\.


--
-- Data for Name: momo_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.momo_transactions (id, customer_name, phone_number, amount, fee, provider, type, reference, notes, status, branch_id, processed_by, float_account_id, created_at, updated_at, user_id, cash_till_affected, float_affected, date, gl_entry_id) FROM stdin;
744881dd-41ad-4d93-ab4f-7b96cc178048	Abdul	0243657896	300.00	30.00	MTN	cash-out	MOMO-1751463189121	\N	completed	635844ab-029a-43f8-8523-d7882915266a	\N	0c6320ae-fb6c-408e-8cfa-934d6d253087	2025-07-02 13:33:10.552794	2025-07-02 13:33:10.552794	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	-270	300	\N	\N
\.


--
-- Data for Name: monthly_commissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.monthly_commissions (id, branch_id, service_type, provider, month, total_transactions, total_volume, total_commission, status, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, branch_id, type, title, message, metadata, priority, status, read_at, created_at) FROM stdin;
9b5e959d-72f8-4155-b7d5-41038e562198	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 4000.00. Reference: undefined	{"type": "withdrawal", "amount": 4000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/28/2025, 12:42:21 PM"}	high	sent	\N	2025-06-28 12:42:22.804568
f10d506e-b027-4200-b00a-21869600ba94	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 1:15:15 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 1:15:15 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 13:15:16.305706
561f3b64-603a-49eb-a911-fb18956e16a7	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 1:40:37 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 1:40:37 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 13:40:38.552449
ce371c4e-fc75-4397-bd76-3bd80d6dad26	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: MoMo cash-in of GHS 100.00. Reference: MOMO-1751118136217	{"type": "cash-in", "amount": 100, "service": "MoMo", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "reference": "MOMO-1751118136217", "timestamp": "6/28/2025, 1:42:18 PM"}	medium	sent	\N	2025-06-28 13:42:19.757461
0575c729-3b09-4e07-a223-c96dd90cd3d6	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 2:14:10 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 2:14:10 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 14:14:11.600685
d485d65d-8f4d-46d7-a1d3-aad1149d0351	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login_alert	New Login Detected	A new login was detected from Ghana (IP: Unknown)	{"location": "Ghana", "ipAddress": "Unknown", "timestamp": "2025-06-28T16:50:59.259Z", "userAgent": "Unknown"}	medium	unread	\N	2025-06-28 16:50:59.902562
717e47eb-6572-4812-b40f-a8226937ef49	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login_alert	New Login Detected	A new login was detected from Ghana (IP: Unknown)	{"location": "Ghana", "ipAddress": "Unknown", "timestamp": "2025-06-28T16:55:33.013Z", "userAgent": "Unknown"}	medium	unread	\N	2025-06-28 16:55:33.624648
59bdc6fa-e589-40b9-be9c-40bd7857e1ab	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login_alert	New Login Detected	A new login was detected from Ghana (IP: Unknown)	{"location": "Ghana", "ipAddress": "Unknown", "timestamp": "2025-06-28T16:56:23.370Z", "userAgent": "Unknown"}	medium	unread	\N	2025-06-28 16:56:23.981421
e2a81192-e2c0-467b-b237-d9c15897939a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 6:18:11 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 6:18:11 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 18:18:12.40594
4be13698-4a41-4991-86c6-320f8ed6a83f	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 6:25:50 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 6:25:50 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 18:25:50.879649
b8e2b759-69ea-42e7-9f70-efd8cdfdd9f0	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 6:49:17 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 6:49:17 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 18:49:18.382071
7b335dc0-60e8-43e4-a662-6a37c8a789b4	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 7:18:25 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 7:18:25 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 19:18:25.657867
2cff7114-1621-44f1-962c-7dd6fbc424fb	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 7:31:41 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 7:31:41 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 19:31:41.798108
a036cccd-89d0-442c-b4cf-b9ff61523375	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 7:55:16 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 7:55:16 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 19:55:16.888494
bb99760c-7078-407f-9909-c980d70bd1cc	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 8:13:50 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 8:13:50 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 20:13:50.894886
4733e0c9-0326-464b-8ef3-e2f59a75e40a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 8:41:22 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 8:41:22 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 20:41:22.802094
bd6d2e22-f3c2-412e-9078-005ee7e6f580	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 200.00. Reference: undefined	{"type": "withdrawal", "amount": 200, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/28/2025, 8:48:12 PM"}	medium	sent	\N	2025-06-28 20:48:12.681547
09920a8a-3cc3-49b7-bf95-a7809e127844	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 9:16:31 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 9:16:31 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 21:16:32.0111
122138f5-2bd6-40df-945d-abd715f4dad1	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 2333.00. Reference: undefined	{"type": "withdrawal", "amount": 2333, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/28/2025, 9:25:59 PM"}	high	sent	\N	2025-06-28 21:25:59.355296
65f0b681-0b21-4013-925d-ea199aa70626	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 9:41:14 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 9:41:14 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 21:41:14.996681
29cd30dd-18b2-49c9-9079-bffb79f530cb	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 9:54:25 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 9:54:25 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 21:54:26.687974
b0e30e2a-cc6a-4a8a-a2dc-198e71b5b66d	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 10:14:24 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 10:14:24 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 22:14:26.087123
e9d5fb6f-c6eb-49e2-80ec-dcf81a510ca7	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 10:27:01 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 10:27:01 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 22:27:02.087144
d2cfb998-c8c8-4fc1-bcc7-d8ade6e4dc48	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 10:44:06 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 10:44:06 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 22:44:06.554295
366ec8eb-b747-4346-8ae7-261fe1bf38eb	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 10:59:44 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 10:59:44 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 22:59:44.480306
a7a71ba9-5d2a-4cfc-b986-b3ae418d4bc7	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/28/2025, 11:51:41 PM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/28/2025, 11:51:41 PM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-28 23:51:41.372533
d6a44021-064f-430b-8274-9c6010fcc7d7	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 12:01:25 AM. IP: Unknown. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 12:01:25 AM", "ip_address": "Unknown", "user_agent": "Unknown"}	medium	sent	\N	2025-06-29 00:01:25.876323
49cc410a-d16d-48e5-979c-0f683d643feb	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 1:08:13 AM. IP: ::1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 1:08:13 AM", "ip_address": "::1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-06-29 01:08:14.354571
3f9f6794-e7dd-4b29-867f-b331fa8e73dd	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 12:58:40 PM. IP: 154.161.155.173. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 12:58:40 PM", "ip_address": "154.161.155.173", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-06-29 12:58:41.3206
ab9785f7-fe1e-4382-8df0-2602ea188b1b	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 12:59:24 PM. IP: 154.161.155.173. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 12:59:24 PM", "ip_address": "154.161.155.173", "user_agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"}	medium	sent	\N	2025-06-29 12:59:24.815938
2bc903ea-d0eb-4fed-96a2-3d91599b1f2b	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 3000.00. Reference: undefined	{"type": "withdrawal", "amount": 3000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/29/2025, 1:15:39 PM"}	high	sent	\N	2025-06-29 13:15:39.958512
b87800d9-e06f-407b-be6d-f68da25bacde	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 2:05:07 PM. IP: ::ffff:127.0.0.1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 2:05:07 PM", "ip_address": "::ffff:127.0.0.1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0"}	medium	sent	\N	2025-06-29 14:05:08.206225
11e54f21-96d8-4dc0-a341-fff260bba887	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 2:10:21 PM. IP: 102.176.101.83. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 2:10:21 PM", "ip_address": "102.176.101.83", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	medium	sent	\N	2025-06-29 14:10:22.013315
c1b94399-928c-461e-98a8-c88e34ef4cce	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 2:10:32 PM. IP: 102.176.101.83. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 2:10:32 PM", "ip_address": "102.176.101.83", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	medium	sent	\N	2025-06-29 14:10:32.143658
81d6e370-b9ef-4265-9879-928ff54ba2a0	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 2:53:26 PM. IP: ::ffff:127.0.0.1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 2:53:26 PM", "ip_address": "::ffff:127.0.0.1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0"}	medium	sent	\N	2025-06-29 14:53:27.299336
e298e916-3456-4385-abdd-70c957d2f74f	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	\N	system_alert	Test Notification	This is a test notification to verify your notification settings are working correctly.	{"test": true, "timestamp": "2025-06-29T15:28:26.264Z"}	low	sent	\N	2025-06-29 15:28:27.868958
1e1f6cde-3cb4-4861-b5cb-bb911b99fd89	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/29/2025, 5:46:39 PM. IP: ::ffff:127.0.0.1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 5:46:39 PM", "ip_address": "::ffff:127.0.0.1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0"}	medium	sent	\N	2025-06-29 17:46:39.921135
17c834b8-21b7-4bf8-a0c6-e30731e29f42	5dccf788-6752-45fc-8aed-62317161b589	a0bf870c-b7b7-437d-aaf6-e3fa54831545	login	New Login Alert	Hello Mubarik Abdul-Wahab, a new login was detected on your account at 6/29/2025, 11:15:35 PM. IP: 154.161.119.163. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/29/2025, 11:15:35 PM", "ip_address": "154.161.119.163", "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"}	medium	sent	\N	2025-06-29 23:15:36.19297
e5eff579-6c71-4fd1-809a-968e2d794987	5dccf788-6752-45fc-8aed-62317161b589	\N	system_alert	Test Notification	This is a test notification to verify your notification settings are working correctly.	{"test": true, "timestamp": "2025-06-29T23:28:10.645Z"}	low	sent	\N	2025-06-29 23:28:11.099553
e9c2f86d-199e-41cf-ba54-d3e9c746cb32	5dccf788-6752-45fc-8aed-62317161b589	a0bf870c-b7b7-437d-aaf6-e3fa54831545	login	New Login Alert	Hello Mubarik Abdul-Wahab, a new login was detected on your account at 6/30/2025, 9:39:14 AM. IP: 154.161.250.116. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/30/2025, 9:39:14 AM", "ip_address": "154.161.250.116", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-06-30 09:39:15.215654
008a8634-ee05-443f-9f09-3c44323183fc	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking deposit of GHS 1000.00. Reference: undefined	{"type": "deposit", "amount": 1000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 10:13:09 AM"}	medium	sent	\N	2025-06-30 10:13:09.170888
90c763ef-b5c5-4dee-8061-5e27b8e4d9cd	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking deposit of GHS 1000.00. Reference: undefined	{"type": "deposit", "amount": 1000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 1:27:56 PM"}	medium	sent	\N	2025-06-30 13:27:55.700773
7afd2ae4-8605-4cca-9b42-ab9817436173	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 484.21. Reference: undefined	{"type": "withdrawal", "amount": 484.21, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 1:59:59 PM"}	medium	sent	\N	2025-06-30 13:59:59.343327
69e37e68-f420-402a-bb93-98ad0971fefb	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 600.00. Reference: undefined	{"type": "withdrawal", "amount": 600, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:00:50 PM"}	medium	sent	\N	2025-06-30 14:00:49.981624
15f2cdd6-a753-45c6-9e51-b0ce6a0b8957	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 484.21. Reference: undefined	{"type": "withdrawal", "amount": 484.21, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:04:43 PM"}	medium	sent	\N	2025-06-30 14:04:42.985141
5e2e7cc1-bf02-415e-99ac-eae709b935a4	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 3000.00. Reference: undefined	{"type": "withdrawal", "amount": 3000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:26:26 PM"}	high	sent	\N	2025-06-30 14:26:26.744737
29019787-ee7c-492a-9c2e-0c37dc36c1cf	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking deposit of GHS 3000.00. Reference: undefined	{"type": "deposit", "amount": 3000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:27:15 PM"}	high	sent	\N	2025-06-30 14:27:14.793131
245ec558-7ed9-42a2-a926-4a7bfa4e109f	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 3000.00. Reference: undefined	{"type": "withdrawal", "amount": 3000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:35:53 PM"}	high	sent	\N	2025-06-30 14:35:52.532766
6ab76181-83ed-4a00-9ae3-31f423a75bfd	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 3000.00. Reference: undefined	{"type": "withdrawal", "amount": 3000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:36:22 PM"}	high	sent	\N	2025-06-30 14:36:22.031057
92373954-65b3-493c-b078-b9b116a07e20	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking withdrawal of GHS 1000.00. Reference: undefined	{"type": "withdrawal", "amount": 1000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:39:09 PM"}	medium	sent	\N	2025-06-30 14:39:08.678373
5d28ed2e-e088-4746-a18e-1466d09fdbe5	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking deposit of GHS 1000.00. Reference: undefined	{"type": "deposit", "amount": 1000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 2:40:05 PM"}	medium	sent	\N	2025-06-30 14:40:04.780957
ced0776d-ac8c-4914-8c72-917fc48c1c0f	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	transaction	Transaction Alert	Transaction processed: Agency Banking interbank of GHS 1000.00. Reference: undefined	{"type": "interbank", "amount": 1000, "service": "Agency Banking", "branchId": "635844ab-029a-43f8-8523-d7882915266a", "timestamp": "6/30/2025, 3:15:47 PM"}	medium	sent	\N	2025-06-30 15:15:47.293451
e64e1fb4-2e9e-408b-93c0-9c4d9b91556f	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 6/30/2025, 5:31:21 PM. IP: ::1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "6/30/2025, 5:31:21 PM", "ip_address": "::1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-06-30 20:28:59.057218
a1c79e25-2ffc-465a-91e2-b8dca58464d9	5dccf788-6752-45fc-8aed-62317161b589	a0bf870c-b7b7-437d-aaf6-e3fa54831545	login	New Login Alert	Hello Mubarik Abdul-Wahab, a new login was detected on your account at 7/1/2025, 4:51:39 PM. IP: 154.161.227.66. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "7/1/2025, 4:51:39 PM", "ip_address": "154.161.227.66", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-07-01 16:51:40.083041
01b1163d-37f6-467b-8ded-5296bcf4a87c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 7/1/2025, 8:06:45 PM. IP: ::1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "7/1/2025, 8:06:45 PM", "ip_address": "::1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-07-01 20:06:45.701128
98a33750-5030-40e7-b01b-5d616b5836ce	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 7/2/2025, 7:26:18 AM. IP: ::1. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "7/2/2025, 7:26:18 AM", "ip_address": "::1", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-07-02 07:26:19.344744
fa1e4279-87a0-4125-a4f3-6f78df1bf690	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	login	New Login Alert	Hello Mohammed Salim, a new login was detected on your account at 7/2/2025, 7:29:40 AM. IP: 102.216.213.89. If this wasn't you, please contact support immediately.	{"location": "Ghana", "timestamp": "7/2/2025, 7:29:40 AM", "ip_address": "102.216.213.89", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	medium	sent	\N	2025-07-02 07:29:41.18094
\.


--
-- Data for Name: partner_banks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.partner_banks (id, name, code, status, transfer_fee, min_fee, max_fee, float_account_id, created_at, updated_at, branch_id) FROM stdin;
gcb-001	Ghana Commercial Bank	GCB	active	0.0100	5.00	50.00	\N	2025-05-23 21:56:40.17898+00	2025-05-24 15:22:16.530259+00	635844ab-029a-43f8-8523-d7882915266a
eco-001	Ecobank Ghana	ECO	active	0.0150	5.00	60.00	\N	2025-05-23 21:56:40.574372+00	2025-05-24 15:22:17.032107+00	635844ab-029a-43f8-8523-d7882915266a
stb-001	Stanbic Bank	STB	active	0.0125	5.00	55.00	\N	2025-05-23 21:56:40.971015+00	2025-05-24 15:22:17.518518+00	635844ab-029a-43f8-8523-d7882915266a
cal-001	Cal Bank	CAL	active	0.0100	5.00	45.00	\N	2025-05-23 21:56:41.355094+00	2025-05-24 15:22:18.337025+00	635844ab-029a-43f8-8523-d7882915266a
zen-001	Zenith Bank	ZEN	active	0.0175	5.00	65.00	\N	2025-05-23 21:56:41.737255+00	2025-05-24 15:22:18.808239+00	635844ab-029a-43f8-8523-d7882915266a
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.permissions (id, name, display_name, description, category, is_system, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: power_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.power_transactions (id, reference, type, meter_number, provider, amount, commission, customer_name, customer_phone, status, branch_id, user_id, metadata, created_at, updated_at, fee, float_account_id, processed_by, date, gl_entry_id, notes) FROM stdin;
4b0940e6-c4e9-4bdb-940b-c584c4d12436	PWR-1750622237340	sale	9872938745	ecg	200.00	0.00	Salim	0574821675	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "200 kWh", "tokenNumber": "6821362552216562"}	2025-06-22 19:57:18.735771+00	2025-06-22 19:57:18.735771+00	\N	\N	\N	\N	\N	\N
cfd02a2f-b349-4efe-b90c-72ef0e3e0092	PWR-1750779543814	sale	6546545	nedco	1000.00	0.00	MOHAMMED SALIM ABDUL-MAJEED	0549514616	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "1000 kWh", "tokenNumber": "8618002294618827"}	2025-06-24 15:39:05.747201+00	2025-06-24 15:39:05.747201+00	\N	\N	\N	\N	\N	\N
bde41781-0178-4b1e-9bf7-e24b6da73325	PWR-1750781961501	sale	6546545	ecg	100.00	0.00	Majeed Ayisha	0506068893	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "100 kWh", "tokenNumber": "9750383326892965"}	2025-06-24 16:19:23.04219+00	2025-06-24 16:19:23.04219+00	\N	\N	\N	\N	\N	\N
fa73c750-58d0-4935-b736-6f554c723786	PWR-1750792256510	sale	6546545	nedco	200.00	0.00	Jane Smith	0574821675	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "200 kWh", "tokenNumber": "0457837848433363"}	2025-06-24 19:10:59.018883+00	2025-06-24 19:10:59.018883+00	\N	\N	\N	\N	\N	\N
ecf9b3a9-ff58-4f8c-a76d-307020ab3369	PWR-1750800674376	sale	6546545	ecg	200.00	0.00	Salim	0201234567	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "200 kWh", "tokenNumber": "0561239453464732"}	2025-06-24 21:31:16.781791+00	2025-06-24 21:31:16.781791+00	\N	\N	\N	\N	\N	\N
b750fee4-267e-4ccd-876f-e92873fda37a	PWR-b25fe243-9a2f-472f-9e26-e0d8daebc13e	sale	6546545	ecg	100.00	0.00	\N	\N	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "100 kWh", "tokenNumber": "3668184409397286"}	2025-06-26 15:18:43.082007+00	2025-06-26 15:18:43.082007+00	\N	\N	\N	\N	\N	\N
8af283eb-812e-463d-bb62-7c2ebc75765a	PWR-e34d4424-8b67-4bda-b8d8-37b8f5645b77	sale	6546545	vra	100.00	0.00	\N	\N	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "100 kWh", "tokenNumber": "0361191969753738"}	2025-06-27 07:35:32.746971+00	2025-06-27 07:35:32.746971+00	\N	\N	\N	\N	\N	\N
58b3c9bd-3561-4bf5-8079-78725ff0ddfb	PWR-2b3987b5-ce0e-4c76-b931-fb09f9def7ab	sale	6546545	vra	200.00	0.00	\N	\N	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "200 kWh", "tokenNumber": "2135558376811135"}	2025-06-27 10:35:43.305488+00	2025-06-27 10:35:43.305488+00	\N	\N	\N	\N	\N	\N
3980b683-a3cc-46a7-bb43-f1419deeaf50	PWR-3119fb9f-f124-4dd3-a16d-1eb9df32d608	sale	6546545	vra	100.00	0.00	\N	\N	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "100 kWh", "tokenNumber": "827542583221684"}	2025-06-27 11:34:24.349043+00	2025-06-27 11:34:24.349043+00	\N	\N	\N	\N	\N	\N
95962dc1-1c3d-4086-809a-006c289a8746	PWR-a90ff8bf-a657-4d4a-b68a-e3a61c4aaf16	sale	6546545	vra	200.00	0.00	\N	\N	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{"units": "200 kWh", "tokenNumber": "4846673023085500"}	2025-06-28 12:43:02.109887+00	2025-06-28 12:43:02.109887+00	\N	\N	\N	\N	\N	\N
f18c1a0a-3068-4803-8f22-c0369749036d	PWR-1751378510023	sale	9379472845	2fe947a8-c85f-42b8-9aff-c85bc4439484	100.00	0.00	Majeed Ayisha	0506068893	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 14:01:55.265758+00	2025-07-01 14:01:55.265758+00	\N	\N	\N	2025-07-01	\N	\N
967b5ab4-2aa6-4271-b1ee-1e1ef9683a02	PWR-1751379028900	sale	89372598734	2fe947a8-c85f-42b8-9aff-c85bc4439484	200.00	0.00	Mohammed Salim Abdul-Majeed	0549514616	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 14:10:34.1241+00	2025-07-01 14:10:34.1241+00	\N	\N	\N	2025-07-01	\N	\N
7a7d89f4-18e7-41b6-b64b-86590365a99b	PWR-1751380157807	sale	829527345	NEDCo	200.00	0.00	ABUBAKARI ABDUL-MAJEED	0242558954	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 14:29:17.966709+00	2025-07-01 14:29:17.966709+00	\N	\N	\N	2025-07-01	\N	\N
d955ea7b-f448-4e68-a73c-8c304bf4c733	PWR-1751382006902	sale	29072384	NEDCo	200.00	0.00	Mohammed Salim Abdul-Majeed	0549514616	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 15:00:07.110869+00	2025-07-01 15:00:07.110869+00	\N	\N	\N	2025-07-01	\N	\N
572264db-97f5-409f-954f-0a87cd289226	PWR-1751389597649	sale	97328739245	NEDCo	100.00	0.00	Ibrahim Hardi	0244123456	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 17:06:41.751612+00	2025-07-01 17:06:41.751612+00	\N	\N	\N	2025-07-01	\N	\N
7cab6a6f-430d-4ba3-8145-70ea66e9210e	PWR-1751401845009	sale	6546545	NEDCo	786.00	0.00	Salim	0574821675	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 20:30:46.613468+00	2025-07-01 20:30:46.613468+00	\N	\N	\N	2025-07-01	\N	\N
99e1ae6f-a96e-44b1-a24d-34d8f477fca0	PWR-1751401876033	sale	6546545	ECG	300.00	0.00	Salim	0244123456	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 20:31:17.589789+00	2025-07-01 20:31:17.589789+00	\N	\N	\N	2025-07-01	\N	\N
75572b89-1813-44d7-9cb9-aca5767a2b49	PWR-1751402528968	sale	6546545	ECG	400.00	0.00	Jane Smith	0244123456	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 20:42:10.715457+00	2025-07-01 20:42:10.715457+00	\N	\N	\N	2025-07-01	\N	\N
24e9efe7-5655-4931-8b4e-cd85c5571422	PWR-1751403358611	sale	6546545	ECG	300.00	0.00	Salim	0244123456	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 20:56:00.214603+00	2025-07-01 20:56:00.214603+00	\N	\N	\N	2025-07-01	\N	\N
cfac0760-be14-4c79-8410-6527fdb61c8b	PWR-1751403396455	sale	6546545	ECG	200.00	0.00	Salim	0277123456	completed	635844ab-029a-43f8-8523-d7882915266a	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	{}	2025-07-01 20:56:37.824844+00	2025-07-01 20:56:37.824844+00	\N	\N	\N	2025-07-01	\N	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, name, description, permissions, is_default, is_system, created_at, updated_at, created_by, updated_by) FROM stdin;
1	System Administrator	Full access to all system functions	{all}	t	t	2025-05-27 09:46:18.604184	2025-05-27 09:46:18.604184	\N	\N
2	Cashier	Process payments and receipts, view till balance	{transactions:process,transactions:view,balance:view}	f	t	2025-05-27 09:46:18.604184	2025-05-27 09:46:18.604184	\N	\N
3	Operations	Initiate transactions, verify customer requests	{transactions:initiate,transactions:verify,customers:view}	f	t	2025-05-27 09:46:18.604184	2025-05-27 09:46:18.604184	\N	\N
4	Manager	Approve high-value transactions, transfer funds, override operations	{transactions:approve,transfers:manage,operations:override}	f	t	2025-05-27 09:46:18.604184	2025-05-27 09:46:18.604184	\N	\N
5	Finance	Access all reports, reconcile accounts, view audit trails	{reports:all,accounts:reconcile,audit:view}	f	t	2025-05-27 09:46:18.604184	2025-05-27 09:46:18.604184	\N	\N
18	Finance Officer	Access all reports, reconcile accounts, view audit trails	{reports:all,accounts:reconcile,audit:view,financial_management,expense_management,commission_management}	f	t	2025-06-22 15:19:52.965075	2025-06-22 15:19:52.965075	\N	\N
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.security_events (id, user_id, event_type, severity, description, ip_address, user_agent, metadata, "timestamp") FROM stdin;
58b1040b-0d91-49df-ba52-04bb72c40a8a	\N	user_registration	low	New user registered: supervisor@mimhaad.com	\N	\N	{}	2025-05-26 12:55:02.205262
3022b864-1768-4983-a5e0-56c46155c5b7	\N	user_registration	low	New user registered: accountant@mimhaad.com	\N	\N	{}	2025-05-26 12:57:01.525926
79cbedc7-bb7c-4df4-9aed-46322176e81c	\N	user_registration	low	New user registered: auditor@mimhaad.com	\N	\N	{}	2025-05-26 12:57:03.422603
d9052453-d359-41d3-8999-6365e3181319	\N	user_registration	low	New user registered: analyst@mimhaad.com	\N	\N	{}	2025-05-26 12:57:07.150359
1fd925f3-8634-410d-b282-563b07750498	\N	user_registration	low	New user registered: operator@mimhaad.com	\N	\N	{}	2025-05-26 12:57:05.278822
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_config (id, config_key, config_value, config_type, description, category, is_encrypted, created_at, updated_at, updated_by) FROM stdin;
55	float_low_threshold	1000	string	Low float threshold amount	float	f	2025-05-27 10:44:34.93867	2025-05-27 10:44:34.93867	\N
56	float_critical_threshold	500	string	Critical float threshold amount	float	f	2025-05-27 10:44:35.235934	2025-05-27 10:44:35.235934	\N
57	max_transaction_amount	50000	string	Maximum transaction amount	limits	f	2025-05-27 10:44:35.483799	2025-05-27 10:44:35.483799	\N
59	approval_required_amount	10000	string	Amount requiring approval	approval	f	2025-05-27 10:44:35.974476	2025-05-27 10:44:35.974476	\N
60	session_timeout_minutes	30	string	User session timeout in minutes	security	f	2025-05-27 10:44:36.205231	2025-05-27 10:44:36.205231	\N
61	api_timeout_seconds	30	string	API request timeout in seconds	api	f	2025-05-27 10:44:36.455474	2025-05-27 10:44:36.455474	\N
62	enable_notifications	true	string	Enable system notifications	notifications	f	2025-05-27 10:44:36.686694	2025-05-27 10:44:36.686694	\N
64	backup_frequency_hours	24	string	Database backup frequency in hours	maintenance	f	2025-05-27 10:44:37.17548	2025-05-27 10:44:37.17548	\N
12	limit_by_user_role	true	boolean	Apply different limits by user role	transaction	f	2025-05-27 09:46:18.109493	2025-05-27 11:30:10.436256	\N
13	momo_api_endpoint	https://api.mtn.com/momo/v1	string	MoMo API endpoint	api	f	2025-05-27 09:46:18.109493	2025-05-27 11:26:26.254409	\N
14	api_key	mtn_api_key_12345	string	API key for external services	api	f	2025-05-27 09:46:18.109493	2025-05-27 11:26:26.509253	\N
15	webhook_url	https://webhook.mimhaad.com/mtn/callback	string	Webhook URL for callbacks	api	f	2025-05-27 09:46:18.109493	2025-05-27 11:26:26.756192	\N
16	test_mode	true	boolean	Enable test mode	api	f	2025-05-27 09:46:18.109493	2025-05-27 11:26:27.024773	\N
17	retry_attempts	3	number	Number of retry attempts	api	f	2025-05-27 09:46:18.109493	2025-05-27 11:26:27.270948	\N
18	timeout	30000	number	API timeout in milliseconds	api	f	2025-05-27 09:46:18.109493	2025-05-27 11:26:27.520251	\N
1	minimum_float	7000	number	Minimum float amount required	float	f	2025-05-27 09:46:18.109493	2025-06-22 14:59:30.395858	1
2	warning_threshold	10000	number	Float warning threshold	float	f	2025-05-27 09:46:18.109493	2025-06-22 14:59:30.795983	1
3	critical_threshold	2000	number	Float critical threshold	float	f	2025-05-27 09:46:18.109493	2025-06-22 14:59:31.274363	1
4	notification_email	alerts@finance.mimhaad.com	string	Email for system notifications	notification	f	2025-05-27 09:46:18.109493	2025-06-22 14:59:31.691139	1
5	enable_sms_notifications	true	boolean	Enable SMS notifications	notification	f	2025-05-27 09:46:18.109493	2025-06-22 14:59:32.097774	1
68	resend_from_name	Mimhaad Financial Servicess	string	\N	general	f	2025-06-20 22:12:59.573469	2025-06-26 14:24:06.354538	1
69	smtp_host	smtp.gmail.com	string	\N	general	f	2025-06-20 22:12:59.996648	2025-06-26 14:24:06.744836	1
7	daily_transaction_limit	50000	number	Daily transaction limit per user	transaction	f	2025-05-27 09:46:18.109493	2025-05-27 11:30:09.190001	\N
8	single_transaction_maximum	10000	number	Maximum single transaction amount	transaction	f	2025-05-27 09:46:18.109493	2025-05-27 11:30:09.445623	\N
9	single_transaction_minimum	5	number	Minimum single transaction amount	transaction	f	2025-05-27 09:46:18.109493	2025-05-27 11:30:09.705421	\N
10	monthly_transaction_limit	500000	number	Monthly transaction limit per user	transaction	f	2025-05-27 09:46:18.109493	2025-05-27 11:30:09.943882	\N
11	require_approval_above	20001	number	Transactions above this require approval	transaction	f	2025-05-27 09:46:18.109493	2025-05-27 11:30:10.178451	\N
70	smtp_port	587	string	\N	general	f	2025-06-20 22:13:00.449888	2025-06-26 14:24:07.132269	1
71	smtp_username	programmingwithsalim@gmail.com	string	\N	general	f	2025-06-20 22:13:00.869691	2025-06-26 14:24:07.526177	1
112	sms_provider	twilio	string	\N	system	f	2025-06-22 15:02:03.098412	2025-06-26 11:54:25.864014	1
72	smtp_password	1h30ld^Guard	string	\N	general	f	2025-06-20 22:13:01.285149	2025-06-26 14:24:07.92966	1
73	smtp_secure	true	string	\N	general	f	2025-06-20 22:13:01.701182	2025-06-26 14:24:08.31606	1
113	sms_api_key	ACd8509a5e3131070ed3ec3b8a6d1588c9	string	\N	system	f	2025-06-22 15:02:03.483553	2025-06-26 11:54:26.676826	1
114	sms_api_secret	2a72bbb3d7f661fbee18e91bcea33f2e	string	\N	system	f	2025-06-22 15:02:03.93831	2025-06-26 11:54:27.023883	1
74	smtp_from_email		string	\N	general	f	2025-06-20 22:13:02.104996	2025-06-26 14:24:08.670306	1
75	smtp_from_name	FinTech Platform	string	\N	general	f	2025-06-20 22:13:02.531917	2025-06-26 14:24:09.054193	1
6	notification_phone	+233509514616	string	Phone for SMS notifications	notification	f	2025-05-27 09:46:18.109493	2025-06-22 14:59:32.486857	1
99	momo_deposit_fee	1.5	string	\N	system	f	2025-06-22 15:00:22.539711	2025-06-22 15:00:22.539711	1
100	momo_withdrawal_fee	2	string	\N	system	f	2025-06-22 15:00:22.961664	2025-06-22 15:00:22.961664	1
101	agency_banking_deposit_fee	5	string	\N	system	f	2025-06-22 15:00:23.392969	2025-06-22 15:00:23.392969	1
102	agency_banking_withdrawal_fee	10	string	\N	system	f	2025-06-22 15:00:23.809125	2025-06-22 15:00:23.809125	1
103	ezwich_card_issuance_fee	15	string	\N	system	f	2025-06-22 15:00:24.208933	2025-06-22 15:00:24.208933	1
104	ezwich_withdrawal_fee	1.5	string	\N	system	f	2025-06-22 15:00:24.590408	2025-06-22 15:00:24.590408	1
105	power_transaction_fee	2	string	\N	system	f	2025-06-22 15:00:25.000311	2025-06-22 15:00:25.000311	1
106	jumia_transaction_fee	1	string	\N	system	f	2025-06-22 15:00:25.509858	2025-06-22 15:00:25.509858	1
115	sms_sender_id	asdfsdf	string	\N	system	f	2025-06-22 15:02:04.365319	2025-06-26 11:54:27.373118	1
65	email_provider	resend	string	\N	general	f	2025-06-20 22:12:58.198068	2025-06-26 14:24:05.152543	1
66	resend_api_key	re_RJus2Pwt_Lmg6cG4ZvxNgtEaU6CumyouV	string	\N	general	f	2025-06-20 22:12:58.717999	2025-06-26 14:24:05.546153	1
67	resend_from_email	info@mimhaadholdings.com	string	\N	general	f	2025-06-20 22:12:59.130352	2025-06-26 14:24:05.956173	1
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_settings (id, key, value, category, description, data_type, is_public, created_at, updated_at) FROM stdin;
1	float_min_threshold_momo	10000	float_thresholds	Minimum threshold for Mobile Money float accounts	number	f	2025-06-22 17:27:25.89564+00	2025-06-22 17:27:25.89564+00
2	float_max_threshold_momo	100000	float_thresholds	Maximum threshold for Mobile Money float accounts	number	f	2025-06-22 17:27:27.12852+00	2025-06-22 17:27:27.12852+00
3	float_min_threshold_agency_banking	20000	float_thresholds	Minimum threshold for Agency Banking float accounts	number	f	2025-06-22 17:27:27.376516+00	2025-06-22 17:27:27.376516+00
4	float_max_threshold_agency_banking	150000	float_thresholds	Maximum threshold for Agency Banking float accounts	number	f	2025-06-22 17:27:27.65635+00	2025-06-22 17:27:27.65635+00
5	float_min_threshold_e_zwich	5000	float_thresholds	Minimum threshold for E-Zwich float accounts	number	f	2025-06-22 17:27:27.912233+00	2025-06-22 17:27:27.912233+00
6	float_max_threshold_e_zwich	80000	float_thresholds	Maximum threshold for E-Zwich float accounts	number	f	2025-06-22 17:27:30.329238+00	2025-06-22 17:27:30.329238+00
7	float_min_threshold_power	5000	float_thresholds	Minimum threshold for Power float accounts	number	f	2025-06-22 17:27:30.569852+00	2025-06-22 17:27:30.569852+00
8	float_max_threshold_power	60000	float_thresholds	Maximum threshold for Power float accounts	number	f	2025-06-22 17:27:30.824545+00	2025-06-22 17:27:30.824545+00
9	float_critical_threshold_percentage	80	float_thresholds	Percentage below minimum threshold to consider critical	number	f	2025-06-22 17:27:31.064367+00	2025-06-22 17:27:31.064367+00
10	float_low_threshold_percentage	150	float_thresholds	Percentage of minimum threshold to consider low	number	f	2025-06-22 17:27:31.306358+00	2025-06-22 17:27:31.306358+00
\.


--
-- Data for Name: transaction_reversals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.transaction_reversals (id, transaction_id, reversal_type, service_type, reason, amount, fee, customer_name, phone_number, account_number, branch_id, requested_by, requested_at, status, reviewed_by, reviewed_at, review_comments, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_branch_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_branch_assignments (id, user_id, branch_id, is_primary, created_at, updated_at) FROM stdin;
13ba3a87-d2d1-4040-a4f7-a61d804d2186	4c903976-c3b4-4cad-9752-e0439c22dcca	635844ab-029a-43f8-8523-d7882915266a	t	2025-06-04 15:54:04.156544	2025-06-04 15:54:04.156544
d640186b-787c-417f-bc18-88344ab384a2	722c7a87-9e09-4b8e-8ee4-97a43fb49115	635844ab-029a-43f8-8523-d7882915266a	t	2025-06-04 15:54:41.830764	2025-06-04 15:54:41.830764
7a0aca82-c8e2-4071-b206-bdfe831563b4	68032bdf-0f14-4442-ae36-b400c6289e5c	635844ab-029a-43f8-8523-d7882915266a	t	2025-06-04 15:56:33.147986	2025-06-04 15:56:33.147986
f6922961-8c33-49c9-8837-00a0d951ad46	af3330e8-0122-48d1-a5b8-69996df563b2	635844ab-029a-43f8-8523-d7882915266a	t	2025-06-04 15:57:05.476485	2025-06-04 15:57:05.476485
823172bb-0a11-45a7-a421-980d5a4b0e67	a5e4d9a1-1371-4ad3-a4b6-abf247402e21	45924a0f-eca7-4e34-ad4f-a86272ad72d9	t	2025-06-05 07:39:14.949018	2025-06-05 07:39:14.949018
035a36a1-a570-4374-8d4a-6de0752f6af9	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	635844ab-029a-43f8-8523-d7882915266a	t	2025-06-05 09:30:12.14883	2025-06-05 09:30:12.14883
887f294c-74ba-49b5-967c-1d2c828c8e63	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	45924a0f-eca7-4e34-ad4f-a86272ad72d9	f	2025-06-05 09:30:12.401292	2025-06-05 09:30:12.401292
3cd74a7a-297f-4098-8fe7-152d9fee1656	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	a0bf870c-b7b7-437d-aaf6-e3fa54831545	f	2025-06-05 09:30:12.642375	2025-06-05 09:30:12.642375
fee6e955-9305-4543-9785-cd005b39a79b	27ddc4f8-bb10-4688-891c-9e64f22eab9f	45924a0f-eca7-4e34-ad4f-a86272ad72d9	t	2025-06-07 01:30:19.551551	2025-06-07 01:30:19.551551
55f84ea4-2950-47d9-9360-d54f3c52607b	aa0e0fe6-335f-420f-8960-74b4b7a6293d	45924a0f-eca7-4e34-ad4f-a86272ad72d9	t	2025-06-07 01:30:46.889621	2025-06-07 01:30:46.889621
0b67975c-c6ad-4cb7-b2b9-4cae1cb9621e	7429fb11-d7ad-49f5-b4a9-8fac7b628540	45924a0f-eca7-4e34-ad4f-a86272ad72d9	t	2025-06-07 01:31:27.117542	2025-06-07 01:31:27.117542
486cb698-9ffe-446c-adf7-d0a9a0834e37	e4427f28-fcce-4874-a91a-11c8bf248737	45924a0f-eca7-4e34-ad4f-a86272ad72d9	t	2025-06-22 03:04:35.274273	2025-06-22 03:04:35.274273
4e7c2fe9-c114-4857-9fa0-3bb8fa5965eb	5dccf788-6752-45fc-8aed-62317161b589	45924a0f-eca7-4e34-ad4f-a86272ad72d9	f	2025-06-29 19:21:44.915303	2025-06-29 19:21:44.915303
31a592a4-18bb-4cd7-ac8d-34e88852f2ad	5dccf788-6752-45fc-8aed-62317161b589	635844ab-029a-43f8-8523-d7882915266a	f	2025-06-29 19:21:45.153084	2025-06-29 19:21:45.153084
9e8e2ffe-9c1b-49ec-bf08-8227bbc87887	5dccf788-6752-45fc-8aed-62317161b589	a0bf870c-b7b7-437d-aaf6-e3fa54831545	t	2025-06-29 19:21:45.571298	2025-06-29 19:21:45.571298
\.


--
-- Data for Name: user_notification_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_notification_settings (id, user_id, email_notifications, email_address, sms_notifications, phone_number, push_notifications, transaction_alerts, float_threshold_alerts, system_updates, security_alerts, daily_reports, weekly_reports, login_alerts, marketing_emails, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, alert_frequency, report_frequency, created_at, updated_at) FROM stdin;
a7e447c2-57cb-4beb-b7b1-cc5b2b715cdd	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	t	programmingwithsalim@gmail.com	t	+233549514616	t	t	t	t	t	t	f	t	t	f	22:00:00	08:00:00	immediate	daily	2025-06-22 16:03:55.344135+00	2025-06-27 19:10:43.837086+00
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_sessions (id, user_id, session_token, expires_at, created_at, updated_at, ip_address, user_agent, is_active) FROM stdin;
670fcb14-24d6-4fb4-91c2-7460ebc0ed2c	74c0a86e-2585-443f-9c2e-44fbb2bcd79c	jq3gqehkgu5a3e8j50qrjlwt492ecbaj	2025-06-29 17:25:18.178+00	2025-06-28 17:25:18.259789+00	2025-06-28 17:25:18.259789+00	\N	Unknown	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, first_name, last_name, email, role, primary_branch_id, phone, status, password_hash, password_reset_required, last_password_reset, last_login, created_at, updated_at, avatar) FROM stdin;
5dccf788-6752-45fc-8aed-62317161b589	Mubarik	Abdul-Wahab	mubarik@mimhaadholdings.com	Admin	a0bf870c-b7b7-437d-aaf6-e3fa54831545	\N	active	$2b$12$RklRaOg/dkrkF2xBwHr2LOESNtmcHG4.M0fZ5qa/EN29v4PLioT1S	t	\N	2025-07-01 16:51:39.12179	2025-06-29 19:21:42.897536	2025-06-29 19:21:42.897536	/placeholder.svg
74c0a86e-2585-443f-9c2e-44fbb2bcd79c	Mohammed	Salim	programmingwithsalim@gmail.com	Admin	635844ab-029a-43f8-8523-d7882915266a	0242558954	active	$2b$12$IolO2pUh0ehjNet2fgrLL../f2sI8vHS25I8n6PcsoY22wLhXATr.	f	\N	2025-07-02 07:29:40.57994	2025-05-26 14:06:51.80021	2025-06-22 15:06:35.493814	/placeholder.svg?height=200&width=200&text=Avatar_b2bcd79c
722c7a87-9e09-4b8e-8ee4-97a43fb49115	Mubarik	Abdul-Wahab	manager@mimhaad.com	Manager	635844ab-029a-43f8-8523-d7882915266a	0241578963	active	$2b$12$LooFWzykK7AVVGAwwJ0Xlu5WIIrSqrvGWHQH7dYnkAdR2Ta/lBVMa	t	\N	2025-06-23 19:21:59.278097	2025-06-04 15:54:41.570237	2025-06-04 15:54:41.570237	/placeholder.svg
af3330e8-0122-48d1-a5b8-69996df563b2	Iddi	Mohammed	finance@mimhaad.com	Finance	635844ab-029a-43f8-8523-d7882915266a	0578649314	active	$2b$12$lEWWNdHxbKKS9bN8h6BTguSWiBlAiCnK17toUYz/ZamqQ98mnBOu6	t	\N	2025-06-20 21:12:47.132557	2025-06-04 15:57:05.230567	2025-06-04 15:57:05.230567	/placeholder.svg
aa0e0fe6-335f-420f-8960-74b4b7a6293d	Mohammed	Amin	finance1@mimhaad.com	Finance	45924a0f-eca7-4e34-ad4f-a86272ad72d9	\N	active	$2b$12$kHPbN15fUEV4JbWB/pZr..Gvc4Yv5B/Ltwj.7FWhVXb0NFD4fqEDO	t	\N	\N	2025-06-07 01:30:46.50209	2025-06-07 01:30:46.50209	/placeholder.svg
27ddc4f8-bb10-4688-891c-9e64f22eab9f	Alhassan	Iddrisu	manager1@mimhaad.com	Manager	45924a0f-eca7-4e34-ad4f-a86272ad72d9	\N	active	$2b$12$P5I1cIhfetw1CfwrSIBiJeV1cwwOcyGW9cVY8Puf1GXlq15smbHf6	t	\N	2025-06-22 01:06:22.443392	2025-06-07 01:30:19.14479	2025-06-07 01:30:19.14479	/placeholder.svg
a5e4d9a1-1371-4ad3-a4b6-abf247402e21	Majeed	Ayisha	ayisha@gmail.com	Cashier	45924a0f-eca7-4e34-ad4f-a86272ad72d9	+233506068893	active	$2b$12$jzGDqQRiTsOdNlvdNX25FOlcmg59QgtML64fvy5HruGmkT6dIEkZC	t	\N	2025-06-11 07:08:24.021866	2025-06-05 07:39:14.263414	2025-06-05 07:39:14.263414	/placeholder.svg
4c903976-c3b4-4cad-9752-e0439c22dcca	Mohammed	Ibrahim	operations@mimhaad.com	Operations	635844ab-029a-43f8-8523-d7882915266a	0248756987	active	$2b$12$E5SuelKN2bkAB/ZhzHJ5NOB8FEkX1osJ9rHLV0tbhB/ysIHfLmyhu	t	\N	2025-06-20 21:59:38.832517	2025-06-04 15:54:03.896467	2025-06-04 15:54:03.896467	/placeholder.svg
68032bdf-0f14-4442-ae36-b400c6289e5c	Ziblim	Firdaus	cashier@mimhaad.com	Cashier	635844ab-029a-43f8-8523-d7882915266a	0245879635	active	$2b$12$GbGqsRhoHveVbTCI7mEKse7PL5g8Umz7M.hI2NFSgNqi7Yb/PuBym	t	\N	2025-06-21 08:19:38.916091	2025-06-04 15:56:32.891465	2025-06-04 15:56:32.891465	/placeholder.svg
7429fb11-d7ad-49f5-b4a9-8fac7b628540	Fawaz	Mahama	operations1@mimhad.com	Operations	45924a0f-eca7-4e34-ad4f-a86272ad72d9	\N	active	$2b$12$cbD4mzg9lIz1fjqxYTXiBeKDvlK.VWUH6WdxQDmGOakSskgR6wjaO	t	\N	2025-06-21 08:23:13.270912	2025-06-07 01:31:26.714134	2025-06-07 01:31:26.714134	/placeholder.svg
e4427f28-fcce-4874-a91a-11c8bf248737	Mohammed Salim	Abdul-Majeed	msalim@smassglobal.com	Admin	45924a0f-eca7-4e34-ad4f-a86272ad72d9	+233549514616	active	$2b$12$qrBPDpeoT8eE5qlXFoWJW.2BgVjPkXCzHNIpIVbzr018zjC8fmnLG	t	\N	\N	2025-06-22 03:04:04.678256	2025-06-22 03:04:34.413489	/placeholder.svg
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 2024, true);


--
-- Name: cash_till_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.cash_till_id_seq', 1, false);


--
-- Name: fee_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.fee_config_id_seq', 11, true);


--
-- Name: gl_account_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gl_account_balances_id_seq', 323, true);


--
-- Name: jumia_liability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.jumia_liability_id_seq', 69, true);


--
-- Name: jumia_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.jumia_transactions_id_seq', 85, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.roles_id_seq', 260, true);


--
-- Name: system_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.system_config_id_seq', 156, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 10, true);


--
-- Name: users_sync users_sync_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neondb_owner
--

ALTER TABLE ONLY neon_auth.users_sync
    ADD CONSTRAINT users_sync_pkey PRIMARY KEY (id);


--
-- Name: agency_banking_transactions agency_banking_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agency_banking_transactions
    ADD CONSTRAINT agency_banking_transactions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: branch_partner_banks branch_partner_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_partner_banks
    ADD CONSTRAINT branch_partner_banks_pkey PRIMARY KEY (id);


--
-- Name: branches branches_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_code_key UNIQUE (code);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: cash_till_accounts cash_till_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_till_accounts
    ADD CONSTRAINT cash_till_accounts_pkey PRIMARY KEY (id);


--
-- Name: cash_till cash_till_branch_id_date_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_till
    ADD CONSTRAINT cash_till_branch_id_date_key UNIQUE (branch_id, date);


--
-- Name: cash_till cash_till_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cash_till
    ADD CONSTRAINT cash_till_pkey PRIMARY KEY (id);


--
-- Name: commission_approvals commission_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_approvals
    ADD CONSTRAINT commission_approvals_pkey PRIMARY KEY (id);


--
-- Name: commission_comments commission_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_comments
    ADD CONSTRAINT commission_comments_pkey PRIMARY KEY (id);


--
-- Name: commission_metadata commission_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_metadata
    ADD CONSTRAINT commission_metadata_pkey PRIMARY KEY (id);


--
-- Name: commission_payments commission_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_payments
    ADD CONSTRAINT commission_payments_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_reference_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_reference_key UNIQUE (reference);


--
-- Name: e_zwich_card_issuances e_zwich_card_issuances_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_card_issuances
    ADD CONSTRAINT e_zwich_card_issuances_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_partner_accounts e_zwich_partner_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_partner_accounts
    ADD CONSTRAINT e_zwich_partner_accounts_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_transactions e_zwich_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_transactions
    ADD CONSTRAINT e_zwich_transactions_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_withdrawals e_zwich_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_withdrawals
    ADD CONSTRAINT e_zwich_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_withdrawals e_zwich_withdrawals_transaction_reference_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_withdrawals
    ADD CONSTRAINT e_zwich_withdrawals_transaction_reference_key UNIQUE (transaction_reference);


--
-- Name: expense_approvals expense_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expense_approvals
    ADD CONSTRAINT expense_approvals_pkey PRIMARY KEY (id);


--
-- Name: expense_attachments expense_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT expense_attachments_pkey PRIMARY KEY (id);


--
-- Name: expense_heads expense_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expense_heads
    ADD CONSTRAINT expense_heads_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_reference_number_key UNIQUE (reference_number);


--
-- Name: ezwich_card_batches ezwich_card_batches_batch_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_card_batches
    ADD CONSTRAINT ezwich_card_batches_batch_code_key UNIQUE (batch_code);


--
-- Name: ezwich_card_batches ezwich_card_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_card_batches
    ADD CONSTRAINT ezwich_card_batches_pkey PRIMARY KEY (id);


--
-- Name: ezwich_cards ezwich_cards_card_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_cards
    ADD CONSTRAINT ezwich_cards_card_number_key UNIQUE (card_number);


--
-- Name: ezwich_cards ezwich_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_cards
    ADD CONSTRAINT ezwich_cards_pkey PRIMARY KEY (id);


--
-- Name: ezwich_stock_movements ezwich_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_stock_movements
    ADD CONSTRAINT ezwich_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: ezwich_transactions ezwich_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_transactions
    ADD CONSTRAINT ezwich_transactions_pkey PRIMARY KEY (id);


--
-- Name: ezwich_withdrawals ezwich_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_withdrawals
    ADD CONSTRAINT ezwich_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: ezwich_withdrawals ezwich_withdrawals_transaction_reference_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_withdrawals
    ADD CONSTRAINT ezwich_withdrawals_transaction_reference_key UNIQUE (transaction_reference);


--
-- Name: fee_config fee_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fee_config
    ADD CONSTRAINT fee_config_pkey PRIMARY KEY (id);


--
-- Name: fee_config fee_config_service_type_transaction_type_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fee_config
    ADD CONSTRAINT fee_config_service_type_transaction_type_key UNIQUE (service_type, transaction_type);


--
-- Name: float_account_gl_mapping float_account_gl_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_account_gl_mapping
    ADD CONSTRAINT float_account_gl_mapping_pkey PRIMARY KEY (id);


--
-- Name: float_account_gl_mapping float_account_gl_mapping_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_account_gl_mapping
    ADD CONSTRAINT float_account_gl_mapping_unique UNIQUE (float_account_id, mapping_type);


--
-- Name: float_accounts float_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_accounts
    ADD CONSTRAINT float_accounts_pkey PRIMARY KEY (id);


--
-- Name: float_gl_mapping float_gl_mapping_float_account_id_mapping_type_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_gl_mapping
    ADD CONSTRAINT float_gl_mapping_float_account_id_mapping_type_key UNIQUE (float_account_id, mapping_type);


--
-- Name: float_gl_mapping float_gl_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_gl_mapping
    ADD CONSTRAINT float_gl_mapping_pkey PRIMARY KEY (id);


--
-- Name: float_gl_mappings float_gl_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_gl_mappings
    ADD CONSTRAINT float_gl_mappings_pkey PRIMARY KEY (id);


--
-- Name: float_recharge_transactions float_recharge_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_recharge_transactions
    ADD CONSTRAINT float_recharge_transactions_pkey PRIMARY KEY (id);


--
-- Name: float_transactions float_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_transactions
    ADD CONSTRAINT float_transactions_pkey PRIMARY KEY (id);


--
-- Name: gl_account_balances gl_account_balances_account_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_account_balances
    ADD CONSTRAINT gl_account_balances_account_id_key UNIQUE (account_id);


--
-- Name: gl_account_balances gl_account_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_account_balances
    ADD CONSTRAINT gl_account_balances_pkey PRIMARY KEY (id);


--
-- Name: gl_accounts gl_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_code_key UNIQUE (code);


--
-- Name: gl_accounts gl_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_pkey PRIMARY KEY (id);


--
-- Name: gl_journal_entries gl_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_journal_entries
    ADD CONSTRAINT gl_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: gl_mappings gl_mappings_branch_id_transaction_type_mapping_type_float_a_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_branch_id_transaction_type_mapping_type_float_a_key UNIQUE (branch_id, transaction_type, mapping_type, float_account_id);


--
-- Name: gl_mappings gl_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_pkey PRIMARY KEY (id);


--
-- Name: gl_sync_logs gl_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_sync_logs
    ADD CONSTRAINT gl_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: gl_transactions gl_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_transactions
    ADD CONSTRAINT gl_transactions_pkey PRIMARY KEY (id);


--
-- Name: jumia_liability jumia_liability_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_liability
    ADD CONSTRAINT jumia_liability_pkey PRIMARY KEY (id);


--
-- Name: jumia_transactions jumia_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_transactions
    ADD CONSTRAINT jumia_transactions_pkey PRIMARY KEY (id);


--
-- Name: jumia_transactions jumia_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_transactions
    ADD CONSTRAINT jumia_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: momo_transactions momo_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.momo_transactions
    ADD CONSTRAINT momo_transactions_pkey PRIMARY KEY (id);


--
-- Name: monthly_commissions monthly_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.monthly_commissions
    ADD CONSTRAINT monthly_commissions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: partner_banks partner_banks_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_banks
    ADD CONSTRAINT partner_banks_code_key UNIQUE (code);


--
-- Name: partner_banks partner_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.partner_banks
    ADD CONSTRAINT partner_banks_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: power_transactions power_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.power_transactions
    ADD CONSTRAINT power_transactions_pkey PRIMARY KEY (id);


--
-- Name: power_transactions power_transactions_reference_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.power_transactions
    ADD CONSTRAINT power_transactions_reference_key UNIQUE (reference);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_config_key_key UNIQUE (config_key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: transaction_reversals transaction_reversals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transaction_reversals
    ADD CONSTRAINT transaction_reversals_pkey PRIMARY KEY (id);


--
-- Name: e_zwich_partner_accounts unique_branch_bank_account; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_partner_accounts
    ADD CONSTRAINT unique_branch_bank_account UNIQUE (branch_id, bank_name, account_number);


--
-- Name: jumia_liability unique_branch_liability; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_liability
    ADD CONSTRAINT unique_branch_liability UNIQUE (branch_id);


--
-- Name: branch_partner_banks unique_branch_partner_bank; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branch_partner_banks
    ADD CONSTRAINT unique_branch_partner_bank UNIQUE (branch_id, partner_bank_id);


--
-- Name: user_branch_assignments user_branch_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_branch_assignments user_branch_assignments_user_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_user_id_branch_id_key UNIQUE (user_id, branch_id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: neondb_owner
--

CREATE INDEX users_sync_deleted_at_idx ON neon_auth.users_sync USING btree (deleted_at);


--
-- Name: idx_agency_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_branch_id ON public.agency_banking_transactions USING btree (branch_id);


--
-- Name: idx_agency_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_created_at ON public.agency_banking_transactions USING btree (created_at);


--
-- Name: idx_agency_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_status ON public.agency_banking_transactions USING btree (status);


--
-- Name: idx_agency_transactions_account_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_account_number ON public.agency_banking_transactions USING btree (account_number);


--
-- Name: idx_agency_transactions_branch_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_branch_date ON public.agency_banking_transactions USING btree (branch_id, date);


--
-- Name: idx_agency_transactions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_branch_id ON public.agency_banking_transactions USING btree (branch_id);


--
-- Name: idx_agency_transactions_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_date ON public.agency_banking_transactions USING btree (date);


--
-- Name: idx_agency_transactions_partner_bank_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_partner_bank_code ON public.agency_banking_transactions USING btree (partner_bank_code);


--
-- Name: idx_agency_transactions_partner_bank_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_partner_bank_id ON public.agency_banking_transactions USING btree (partner_bank_id);


--
-- Name: idx_agency_transactions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_status ON public.agency_banking_transactions USING btree (status);


--
-- Name: idx_agency_transactions_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_agency_transactions_user_id ON public.agency_banking_transactions USING btree (user_id);


--
-- Name: idx_audit_logs_action_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_action_type ON public.audit_logs USING btree (action_type);


--
-- Name: idx_audit_logs_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_branch_id ON public.audit_logs USING btree (branch_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: idx_audit_logs_severity; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_severity ON public.audit_logs USING btree (severity);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_branches_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branches_code ON public.branches USING btree (code);


--
-- Name: idx_branches_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branches_name ON public.branches USING btree (name);


--
-- Name: idx_branches_region; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branches_region ON public.branches USING btree (region);


--
-- Name: idx_branches_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branches_status ON public.branches USING btree (status);


--
-- Name: idx_card_batches_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_card_batches_branch ON public.ezwich_card_batches USING btree (branch_id);


--
-- Name: idx_card_batches_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_card_batches_status ON public.ezwich_card_batches USING btree (status);


--
-- Name: idx_commission_approvals_commission_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commission_approvals_commission_id ON public.commission_approvals USING btree (commission_id);


--
-- Name: idx_commission_comments_commission_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commission_comments_commission_id ON public.commission_comments USING btree (commission_id);


--
-- Name: idx_commission_metadata_commission_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commission_metadata_commission_id ON public.commission_metadata USING btree (commission_id);


--
-- Name: idx_commission_payments_commission_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commission_payments_commission_id ON public.commission_payments USING btree (commission_id);


--
-- Name: idx_commissions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_branch_id ON public.commissions USING btree (branch_id);


--
-- Name: idx_commissions_commission_rate; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_commission_rate ON public.commissions USING btree (commission_rate);


--
-- Name: idx_commissions_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_created_at ON public.commissions USING btree (created_at);


--
-- Name: idx_commissions_month; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_month ON public.commissions USING btree (month);


--
-- Name: idx_commissions_source; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_source ON public.commissions USING btree (source);


--
-- Name: idx_commissions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_status ON public.commissions USING btree (status);


--
-- Name: idx_commissions_transaction_volume; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_commissions_transaction_volume ON public.commissions USING btree (transaction_volume);


--
-- Name: idx_e_zwich_batches_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_e_zwich_batches_branch_id ON public.ezwich_card_batches USING btree (branch_id);


--
-- Name: idx_e_zwich_batches_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_e_zwich_batches_status ON public.ezwich_card_batches USING btree (status);


--
-- Name: idx_e_zwich_partner_accounts_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_e_zwich_partner_accounts_active ON public.e_zwich_partner_accounts USING btree (is_active);


--
-- Name: idx_e_zwich_partner_accounts_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_e_zwich_partner_accounts_branch_id ON public.e_zwich_partner_accounts USING btree (branch_id);


--
-- Name: idx_expense_approvals_expense_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expense_approvals_expense_id ON public.expense_approvals USING btree (expense_id);


--
-- Name: idx_expense_attachments_expense_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expense_attachments_expense_id ON public.expense_attachments USING btree (expense_id);


--
-- Name: idx_expense_heads_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expense_heads_category ON public.expense_heads USING btree (category);


--
-- Name: idx_expense_heads_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expense_heads_is_active ON public.expense_heads USING btree (is_active);


--
-- Name: idx_expenses_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_branch_id ON public.expenses USING btree (branch_id);


--
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- Name: idx_expenses_expense_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_expense_head_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_expense_head_id ON public.expenses USING btree (expense_head_id);


--
-- Name: idx_expenses_reference_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_reference_number ON public.expenses USING btree (reference_number);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_ezwich_batches_batch_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_batches_batch_code ON public.ezwich_card_batches USING btree (batch_code);


--
-- Name: idx_ezwich_batches_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_batches_branch ON public.ezwich_card_batches USING btree (branch_id);


--
-- Name: idx_ezwich_batches_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_batches_created_at ON public.ezwich_card_batches USING btree (created_at);


--
-- Name: idx_ezwich_batches_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_batches_status ON public.ezwich_card_batches USING btree (status);


--
-- Name: idx_ezwich_issuances_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_issuances_branch_id ON public.e_zwich_card_issuances USING btree (branch_id);


--
-- Name: idx_ezwich_issuances_card_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_issuances_card_number ON public.e_zwich_card_issuances USING btree (card_number);


--
-- Name: idx_ezwich_issuances_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_issuances_created_at ON public.e_zwich_card_issuances USING btree (created_at);


--
-- Name: idx_ezwich_withdrawals_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_withdrawals_branch_id ON public.e_zwich_withdrawals USING btree (branch_id);


--
-- Name: idx_ezwich_withdrawals_card_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_withdrawals_card_number ON public.e_zwich_withdrawals USING btree (card_number);


--
-- Name: idx_ezwich_withdrawals_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ezwich_withdrawals_created_at ON public.e_zwich_withdrawals USING btree (created_at);


--
-- Name: idx_float_accounts_account_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_accounts_account_type ON public.float_accounts USING btree (account_type);


--
-- Name: idx_float_accounts_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_accounts_active ON public.float_accounts USING btree (is_active);


--
-- Name: idx_float_accounts_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_accounts_branch_id ON public.float_accounts USING btree (branch_id);


--
-- Name: idx_float_accounts_branch_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_accounts_branch_type ON public.float_accounts USING btree (branch_id, account_type);


--
-- Name: idx_float_accounts_isezwichpartner; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_accounts_isezwichpartner ON public.float_accounts USING btree (isezwichpartner);


--
-- Name: idx_float_accounts_provider; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_accounts_provider ON public.float_accounts USING btree (provider);


--
-- Name: idx_float_gl_mapping_float_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_gl_mapping_float_account ON public.float_account_gl_mapping USING btree (float_account_id);


--
-- Name: idx_float_gl_mapping_float_account_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_gl_mapping_float_account_id ON public.float_account_gl_mapping USING btree (float_account_id);


--
-- Name: idx_float_gl_mapping_gl_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_gl_mapping_gl_account ON public.float_account_gl_mapping USING btree (gl_account_id);


--
-- Name: idx_float_gl_mapping_gl_account_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_float_gl_mapping_gl_account_id ON public.float_account_gl_mapping USING btree (gl_account_id);


--
-- Name: idx_gl_account_balances_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gl_account_balances_branch_id ON public.gl_account_balances USING btree (branch_id);


--
-- Name: idx_gl_accounts_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gl_accounts_code ON public.gl_accounts USING btree (code);


--
-- Name: idx_gl_accounts_parent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gl_accounts_parent ON public.gl_accounts USING btree (parent_id);


--
-- Name: idx_gl_accounts_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gl_accounts_type ON public.gl_accounts USING btree (type);


--
-- Name: idx_gl_transactions_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gl_transactions_date ON public.gl_transactions USING btree (date);


--
-- Name: idx_gl_transactions_source; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gl_transactions_source ON public.gl_transactions USING btree (source_transaction_id);


--
-- Name: idx_jumia_branch_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_jumia_branch_date ON public.jumia_transactions USING btree (branch_id, created_at);


--
-- Name: idx_jumia_tracking; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_jumia_tracking ON public.jumia_transactions USING btree (tracking_id);


--
-- Name: idx_jumia_transactions_branch_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_jumia_transactions_branch_date ON public.jumia_transactions USING btree (branch_id, created_at);


--
-- Name: idx_jumia_type_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_jumia_type_status ON public.jumia_transactions USING btree (transaction_type, status);


--
-- Name: idx_login_attempts_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email, "timestamp");


--
-- Name: idx_login_attempts_ip; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address, "timestamp");


--
-- Name: idx_power_transactions_branch_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_branch_date ON public.power_transactions USING btree (branch_id, created_at);


--
-- Name: idx_power_transactions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_branch_id ON public.power_transactions USING btree (branch_id);


--
-- Name: idx_power_transactions_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_created_at ON public.power_transactions USING btree (created_at);


--
-- Name: idx_power_transactions_provider; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_provider ON public.power_transactions USING btree (provider);


--
-- Name: idx_power_transactions_reference; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_reference ON public.power_transactions USING btree (reference);


--
-- Name: idx_power_transactions_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_type ON public.power_transactions USING btree (type);


--
-- Name: idx_power_transactions_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_power_transactions_user_id ON public.power_transactions USING btree (user_id);


--
-- Name: idx_security_events_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id, "timestamp");


--
-- Name: idx_system_config_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_system_config_category ON public.system_config USING btree (category);


--
-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_system_config_key ON public.system_config USING btree (config_key);


--
-- Name: idx_user_branch_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_branch_branch_id ON public.user_branch_assignments USING btree (branch_id);


--
-- Name: idx_user_branch_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_branch_user_id ON public.user_branch_assignments USING btree (user_id);


--
-- Name: idx_user_notification_settings_email_notifications; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_notification_settings_email_notifications ON public.user_notification_settings USING btree (email_notifications);


--
-- Name: idx_user_notification_settings_sms_notifications; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_notification_settings_sms_notifications ON public.user_notification_settings USING btree (sms_notifications);


--
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_primary_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_primary_branch ON public.users USING btree (primary_branch_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: power_transactions trigger_power_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trigger_power_transactions_updated_at BEFORE UPDATE ON public.power_transactions FOR EACH ROW EXECUTE FUNCTION public.update_power_transactions_updated_at();


--
-- Name: agency_banking_transactions update_agency_banking_transactions_timestamp; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_agency_banking_transactions_timestamp BEFORE UPDATE ON public.agency_banking_transactions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: agency_banking_transactions update_agency_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_agency_transactions_updated_at BEFORE UPDATE ON public.agency_banking_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commissions update_commissions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expense_heads update_expense_heads_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_expense_heads_updated_at BEFORE UPDATE ON public.expense_heads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: e_zwich_card_issuances update_ezwich_issuances_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_ezwich_issuances_updated_at BEFORE UPDATE ON public.e_zwich_card_issuances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: float_accounts update_float_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_float_accounts_updated_at BEFORE UPDATE ON public.float_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: power_transactions update_power_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_power_transactions_updated_at BEFORE UPDATE ON public.power_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_settings update_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_user_notification_settings_updated_at();


--
-- Name: commission_approvals commission_approvals_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_approvals
    ADD CONSTRAINT commission_approvals_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.commissions(id) ON DELETE CASCADE;


--
-- Name: commission_comments commission_comments_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_comments
    ADD CONSTRAINT commission_comments_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.commissions(id) ON DELETE CASCADE;


--
-- Name: commission_metadata commission_metadata_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_metadata
    ADD CONSTRAINT commission_metadata_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.commissions(id) ON DELETE CASCADE;


--
-- Name: commission_payments commission_payments_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.commission_payments
    ADD CONSTRAINT commission_payments_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.commissions(id) ON DELETE CASCADE;


--
-- Name: expense_approvals expense_approvals_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expense_approvals
    ADD CONSTRAINT expense_approvals_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expense_attachments expense_attachments_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT expense_attachments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_expense_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_head_id_fkey FOREIGN KEY (expense_head_id) REFERENCES public.expense_heads(id);


--
-- Name: ezwich_cards ezwich_cards_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ezwich_cards
    ADD CONSTRAINT ezwich_cards_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ezwich_card_batches(id);


--
-- Name: agency_banking_transactions fk_agency_transactions_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agency_banking_transactions
    ADD CONSTRAINT fk_agency_transactions_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: expenses fk_expenses_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: expenses fk_expenses_expense_head; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_expense_head FOREIGN KEY (expense_head_id) REFERENCES public.expense_heads(id) ON DELETE CASCADE;


--
-- Name: e_zwich_card_issuances fk_ezwich_issuances_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_card_issuances
    ADD CONSTRAINT fk_ezwich_issuances_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: e_zwich_withdrawals fk_ezwich_withdrawals_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.e_zwich_withdrawals
    ADD CONSTRAINT fk_ezwich_withdrawals_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: float_accounts fk_float_accounts_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_accounts
    ADD CONSTRAINT fk_float_accounts_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: jumia_transactions fk_jumia_transactions_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jumia_transactions
    ADD CONSTRAINT fk_jumia_transactions_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: power_transactions fk_power_transactions_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.power_transactions
    ADD CONSTRAINT fk_power_transactions_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: user_branch_assignments fk_user_branch_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT fk_user_branch_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE NOT VALID;


--
-- Name: user_branch_assignments fk_user_branch_user; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT fk_user_branch_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;


--
-- Name: users fk_users_primary_branch; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_primary_branch FOREIGN KEY (primary_branch_id) REFERENCES public.branches(id) ON DELETE SET NULL NOT VALID;


--
-- Name: float_accounts float_accounts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_accounts
    ADD CONSTRAINT float_accounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: float_gl_mapping float_gl_mapping_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_gl_mapping
    ADD CONSTRAINT float_gl_mapping_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: float_recharge_transactions float_recharge_transactions_float_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_recharge_transactions
    ADD CONSTRAINT float_recharge_transactions_float_account_id_fkey FOREIGN KEY (float_account_id) REFERENCES public.float_accounts(id);


--
-- Name: float_transactions float_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_transactions
    ADD CONSTRAINT float_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.float_accounts(id);


--
-- Name: float_transactions float_transactions_float_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.float_transactions
    ADD CONSTRAINT float_transactions_float_account_id_fkey FOREIGN KEY (float_account_id) REFERENCES public.float_accounts(id);


--
-- Name: gl_accounts gl_accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.gl_accounts(id);


--
-- Name: gl_journal_entries gl_journal_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_journal_entries
    ADD CONSTRAINT gl_journal_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.gl_accounts(id);


--
-- Name: gl_journal_entries gl_journal_entries_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_journal_entries
    ADD CONSTRAINT gl_journal_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.gl_transactions(id) ON DELETE CASCADE;


--
-- Name: gl_mappings gl_mappings_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gl_mappings
    ADD CONSTRAINT gl_mappings_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: monthly_commissions monthly_commissions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.monthly_commissions
    ADD CONSTRAINT monthly_commissions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

