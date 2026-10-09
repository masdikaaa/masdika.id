--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-10-09 07:18:40

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 78625)
-- Name: AffiliateEarning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AffiliateEarning" (
    id integer NOT NULL,
    "referrerId" integer NOT NULL,
    "referredId" integer NOT NULL,
    amount integer NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 78636)
-- Name: AffiliateEarning_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AffiliateEarning_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5998 (class 0 OID 0)
-- Dependencies: 220
-- Name: AffiliateEarning_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AffiliateEarning_id_seq" OWNED BY public."AffiliateEarning".id;


--
-- TOC entry 221 (class 1259 OID 78637)
-- Name: Announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Announcement" (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'INFO'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "actionUrl" text,
    "imageUrl" text
);


--
-- TOC entry 222 (class 1259 OID 78652)
-- Name: Announcement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Announcement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5999 (class 0 OID 0)
-- Dependencies: 222
-- Name: Announcement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Announcement_id_seq" OWNED BY public."Announcement".id;


--
-- TOC entry 223 (class 1259 OID 78653)
-- Name: ApiKey; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApiKey" (
    id integer NOT NULL,
    name text,
    key text NOT NULL,
    "userId" integer NOT NULL,
    "projectId" integer,
    service text,
    "usageCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsed" timestamp(3) without time zone
);


--
-- TOC entry 224 (class 1259 OID 78667)
-- Name: ApiKey_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ApiKey_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6000 (class 0 OID 0)
-- Dependencies: 224
-- Name: ApiKey_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ApiKey_id_seq" OWNED BY public."ApiKey".id;


--
-- TOC entry 225 (class 1259 OID 78668)
-- Name: ApiProject; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApiProject" (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text,
    endpoint text NOT NULL,
    method text DEFAULT 'GET'::text NOT NULL,
    category text NOT NULL,
    "isPremium" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 78686)
-- Name: ApiProject_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ApiProject_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6001 (class 0 OID 0)
-- Dependencies: 226
-- Name: ApiProject_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ApiProject_id_seq" OWNED BY public."ApiProject".id;


--
-- TOC entry 227 (class 1259 OID 78687)
-- Name: BackgroundJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BackgroundJob" (
    id integer NOT NULL,
    type text NOT NULL,
    payload text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    error text,
    attempts integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 228 (class 1259 OID 78702)
-- Name: BackgroundJob_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BackgroundJob_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6002 (class 0 OID 0)
-- Dependencies: 228
-- Name: BackgroundJob_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BackgroundJob_id_seq" OWNED BY public."BackgroundJob".id;


--
-- TOC entry 229 (class 1259 OID 78703)
-- Name: Banner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Banner" (
    id integer NOT NULL,
    title text NOT NULL,
    "imageUrl" text NOT NULL,
    "actionUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 78716)
-- Name: Banner_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Banner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6003 (class 0 OID 0)
-- Dependencies: 230
-- Name: Banner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Banner_id_seq" OWNED BY public."Banner".id;


--
-- TOC entry 231 (class 1259 OID 78717)
-- Name: BlockedUser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BlockedUser" (
    id integer NOT NULL,
    type text NOT NULL,
    value text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 232 (class 1259 OID 78728)
-- Name: BlockedUser_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BlockedUser_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6004 (class 0 OID 0)
-- Dependencies: 232
-- Name: BlockedUser_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BlockedUser_id_seq" OWNED BY public."BlockedUser".id;


--
-- TOC entry 233 (class 1259 OID 78729)
-- Name: BlogCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BlogCategory" (
    id integer NOT NULL,
    name text NOT NULL,
    slug text
);


--
-- TOC entry 234 (class 1259 OID 78736)
-- Name: BlogCategory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BlogCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6005 (class 0 OID 0)
-- Dependencies: 234
-- Name: BlogCategory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BlogCategory_id_seq" OWNED BY public."BlogCategory".id;


--
-- TOC entry 235 (class 1259 OID 78737)
-- Name: BlogPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BlogPost" (
    id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text NOT NULL,
    content text NOT NULL,
    image text,
    published boolean DEFAULT false NOT NULL,
    "readTime" integer DEFAULT 5 NOT NULL,
    "categoryId" integer NOT NULL,
    "authorId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 78755)
-- Name: BlogPostTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BlogPostTag" (
    "postId" integer NOT NULL,
    "tagId" integer NOT NULL
);


--
-- TOC entry 237 (class 1259 OID 78760)
-- Name: BlogPost_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BlogPost_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6006 (class 0 OID 0)
-- Dependencies: 237
-- Name: BlogPost_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BlogPost_id_seq" OWNED BY public."BlogPost".id;


--
-- TOC entry 238 (class 1259 OID 78761)
-- Name: BlogReaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BlogReaction" (
    id integer NOT NULL,
    "blogPostId" integer NOT NULL,
    "ipHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 239 (class 1259 OID 78771)
-- Name: BlogReaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BlogReaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6007 (class 0 OID 0)
-- Dependencies: 239
-- Name: BlogReaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BlogReaction_id_seq" OWNED BY public."BlogReaction".id;


--
-- TOC entry 240 (class 1259 OID 78772)
-- Name: Certification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Certification" (
    id integer NOT NULL,
    title text NOT NULL,
    org text NOT NULL,
    date text NOT NULL,
    icon text,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 241 (class 1259 OID 78786)
-- Name: Certification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Certification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6008 (class 0 OID 0)
-- Dependencies: 241
-- Name: Certification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Certification_id_seq" OWNED BY public."Certification".id;


--
-- TOC entry 242 (class 1259 OID 78787)
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatMessage" (
    id integer NOT NULL,
    "sessionId" integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "isInjectionAttempt" boolean DEFAULT false NOT NULL,
    "injectionPattern" text,
    "isOutputBlocked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL
);


--
-- TOC entry 243 (class 1259 OID 78804)
-- Name: ChatMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ChatMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6009 (class 0 OID 0)
-- Dependencies: 243
-- Name: ChatMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ChatMessage_id_seq" OWNED BY public."ChatMessage".id;


--
-- TOC entry 244 (class 1259 OID 78805)
-- Name: ChatSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatSession" (
    id integer NOT NULL,
    "sessionId" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "ipAddress" text NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verificationOtp" text,
    "otpExpiresAt" timestamp(3) without time zone,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "endedBy" text,
    "endedAt" timestamp(3) without time zone,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 245 (class 1259 OID 78825)
-- Name: ChatSession_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ChatSession_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6010 (class 0 OID 0)
-- Dependencies: 245
-- Name: ChatSession_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ChatSession_id_seq" OWNED BY public."ChatSession".id;


--
-- TOC entry 246 (class 1259 OID 78826)
-- Name: CloudflareDomain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CloudflareDomain" (
    id integer NOT NULL,
    "cfZoneId" text NOT NULL,
    domain text NOT NULL,
    "nameServers" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 247 (class 1259 OID 78841)
-- Name: CloudflareDomain_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CloudflareDomain_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6011 (class 0 OID 0)
-- Dependencies: 247
-- Name: CloudflareDomain_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CloudflareDomain_id_seq" OWNED BY public."CloudflareDomain".id;


--
-- TOC entry 248 (class 1259 OID 78842)
-- Name: CloudflareTunnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CloudflareTunnel" (
    id integer NOT NULL,
    "cfTunnelId" text NOT NULL,
    name text NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 249 (class 1259 OID 78854)
-- Name: CloudflareTunnel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CloudflareTunnel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6012 (class 0 OID 0)
-- Dependencies: 249
-- Name: CloudflareTunnel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CloudflareTunnel_id_seq" OWNED BY public."CloudflareTunnel".id;


--
-- TOC entry 250 (class 1259 OID 78855)
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    content text NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verificationToken" text,
    "ipAddress" text,
    "blogPostId" integer NOT NULL,
    "parentId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 251 (class 1259 OID 78871)
-- Name: Comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Comment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6013 (class 0 OID 0)
-- Dependencies: 251
-- Name: Comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Comment_id_seq" OWNED BY public."Comment".id;


--
-- TOC entry 252 (class 1259 OID 78872)
-- Name: CommunityGroup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommunityGroup" (
    id integer NOT NULL,
    name text NOT NULL,
    link text NOT NULL,
    image text,
    "isPublished" boolean DEFAULT false NOT NULL,
    "submitterIp" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 253 (class 1259 OID 78885)
-- Name: CommunityGroup_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CommunityGroup_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6014 (class 0 OID 0)
-- Dependencies: 253
-- Name: CommunityGroup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CommunityGroup_id_seq" OWNED BY public."CommunityGroup".id;


--
-- TOC entry 254 (class 1259 OID 78886)
-- Name: CustomService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomService" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    "billingCycle" text DEFAULT 'MONTHLY'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    "terminationDate" timestamp(3) without time zone
);


--
-- TOC entry 255 (class 1259 OID 78904)
-- Name: CustomService_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CustomService_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6015 (class 0 OID 0)
-- Dependencies: 255
-- Name: CustomService_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CustomService_id_seq" OWNED BY public."CustomService".id;


--
-- TOC entry 256 (class 1259 OID 78905)
-- Name: Education; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Education" (
    id integer NOT NULL,
    year text NOT NULL,
    degree text NOT NULL,
    school text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 257 (class 1259 OID 78919)
-- Name: Education_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Education_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6016 (class 0 OID 0)
-- Dependencies: 257
-- Name: Education_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Education_id_seq" OWNED BY public."Education".id;


--
-- TOC entry 258 (class 1259 OID 78920)
-- Name: Episode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Episode" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text NOT NULL,
    image text,
    "videoUrl" text,
    "order" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "seriesId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 259 (class 1259 OID 78937)
-- Name: Episode_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Episode_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6017 (class 0 OID 0)
-- Dependencies: 259
-- Name: Episode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Episode_id_seq" OWNED BY public."Episode".id;


--
-- TOC entry 260 (class 1259 OID 78938)
-- Name: Experience; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Experience" (
    id integer NOT NULL,
    year text NOT NULL,
    role text NOT NULL,
    company text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 261 (class 1259 OID 78952)
-- Name: Experience_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Experience_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6018 (class 0 OID 0)
-- Dependencies: 261
-- Name: Experience_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Experience_id_seq" OWNED BY public."Experience".id;


--
-- TOC entry 262 (class 1259 OID 78953)
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id integer NOT NULL,
    "invoiceNumber" text NOT NULL,
    "userId" integer NOT NULL,
    "subscriptionId" integer,
    "vpsServiceId" integer,
    amount integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "paymentMethod" text,
    "merchantOrderId" text NOT NULL,
    reference text,
    "paymentUrl" text,
    "vaNumber" text,
    "qrString" text,
    "paidAt" timestamp(3) without time zone,
    type text DEFAULT 'SUBSCRIPTION'::text NOT NULL,
    details text,
    "isReadByUser" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "customServiceId" integer,
    subtotal integer DEFAULT 0 NOT NULL,
    "taxAmount" integer DEFAULT 0 NOT NULL,
    "taxRate" integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 263 (class 1259 OID 78978)
-- Name: Invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Invoice_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6019 (class 0 OID 0)
-- Dependencies: 263
-- Name: Invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Invoice_id_seq" OWNED BY public."Invoice".id;


--
-- TOC entry 264 (class 1259 OID 78979)
-- Name: IpPool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IpPool" (
    id integer NOT NULL,
    network text NOT NULL,
    gateway text NOT NULL,
    "startIp" text,
    "endIp" text,
    version integer DEFAULT 4 NOT NULL,
    type text DEFAULT 'PUBLIC'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 265 (class 1259 OID 78994)
-- Name: IpPool_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."IpPool_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6020 (class 0 OID 0)
-- Dependencies: 265
-- Name: IpPool_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."IpPool_id_seq" OWNED BY public."IpPool".id;


--
-- TOC entry 266 (class 1259 OID 78995)
-- Name: KubernetesCluster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KubernetesCluster" (
    id integer NOT NULL,
    name text NOT NULL,
    "userId" integer NOT NULL,
    version text DEFAULT 'Vanilla K8s v1.31'::text NOT NULL,
    endpoint text,
    kubeconfig text,
    "nodeToken" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "installLog" text
);


--
-- TOC entry 267 (class 1259 OID 79010)
-- Name: KubernetesCluster_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."KubernetesCluster_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6021 (class 0 OID 0)
-- Dependencies: 267
-- Name: KubernetesCluster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."KubernetesCluster_id_seq" OWNED BY public."KubernetesCluster".id;


--
-- TOC entry 268 (class 1259 OID 79011)
-- Name: LoginLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LoginLog" (
    id integer NOT NULL,
    "ipAddress" text NOT NULL,
    "emailAttempt" text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    "isBanned" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 269 (class 1259 OID 79025)
-- Name: LoginLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."LoginLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6022 (class 0 OID 0)
-- Dependencies: 269
-- Name: LoginLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."LoginLog_id_seq" OWNED BY public."LoginLog".id;


--
-- TOC entry 270 (class 1259 OID 79026)
-- Name: Message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Message" (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "otpExpiresAt" timestamp(3) without time zone,
    "verificationOtp" text
);


--
-- TOC entry 271 (class 1259 OID 79042)
-- Name: Message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Message_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6023 (class 0 OID 0)
-- Dependencies: 271
-- Name: Message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Message_id_seq" OWNED BY public."Message".id;


--
-- TOC entry 272 (class 1259 OID 79043)
-- Name: Opportunity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Opportunity" (
    id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    slug text,
    description text NOT NULL,
    image text,
    link text,
    date timestamp(3) without time zone,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "isNew" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 273 (class 1259 OID 79059)
-- Name: Opportunity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Opportunity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6024 (class 0 OID 0)
-- Dependencies: 273
-- Name: Opportunity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Opportunity_id_seq" OWNED BY public."Opportunity".id;


--
-- TOC entry 274 (class 1259 OID 79060)
-- Name: PageView; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PageView" (
    id integer NOT NULL,
    "ipHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 275 (class 1259 OID 79069)
-- Name: PageView_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PageView_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6025 (class 0 OID 0)
-- Dependencies: 275
-- Name: PageView_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PageView_id_seq" OWNED BY public."PageView".id;


--
-- TOC entry 276 (class 1259 OID 79070)
-- Name: PaymentMethod; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentMethod" (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    image text,
    fee integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 277 (class 1259 OID 79086)
-- Name: PaymentMethod_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PaymentMethod_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6026 (class 0 OID 0)
-- Dependencies: 277
-- Name: PaymentMethod_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PaymentMethod_id_seq" OWNED BY public."PaymentMethod".id;


--
-- TOC entry 278 (class 1259 OID 79087)
-- Name: Plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Plan" (
    id integer NOT NULL,
    name text NOT NULL,
    service text NOT NULL,
    description text,
    price integer NOT NULL,
    "hourlyPrice" integer DEFAULT 0 NOT NULL,
    limits text NOT NULL,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 279 (class 1259 OID 79106)
-- Name: Plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Plan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6027 (class 0 OID 0)
-- Dependencies: 279
-- Name: Plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Plan_id_seq" OWNED BY public."Plan".id;


--
-- TOC entry 280 (class 1259 OID 79107)
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image text,
    "techStack" text NOT NULL,
    content text NOT NULL,
    client text,
    timeline text,
    role text,
    challenge text,
    solution text,
    testimonial text,
    "testimonialAuthor" text,
    "keyResults" text,
    "projectUrl" text,
    status text DEFAULT 'COMPLETED'::text NOT NULL,
    "categoryId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 281 (class 1259 OID 79124)
-- Name: ProjectCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProjectCategory" (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- TOC entry 282 (class 1259 OID 79131)
-- Name: ProjectCategory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProjectCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6028 (class 0 OID 0)
-- Dependencies: 282
-- Name: ProjectCategory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProjectCategory_id_seq" OWNED BY public."ProjectCategory".id;


--
-- TOC entry 283 (class 1259 OID 79132)
-- Name: Project_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Project_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6029 (class 0 OID 0)
-- Dependencies: 283
-- Name: Project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Project_id_seq" OWNED BY public."Project".id;


--
-- TOC entry 284 (class 1259 OID 79133)
-- Name: Promo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Promo" (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image text,
    link text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "currentClaims" integer DEFAULT 0 NOT NULL,
    "isReward" boolean DEFAULT false NOT NULL,
    "maxClaims" integer DEFAULT 0 NOT NULL,
    "rewardAmount" integer DEFAULT 0 NOT NULL,
    "validUntil" timestamp(3) without time zone
);


--
-- TOC entry 285 (class 1259 OID 79154)
-- Name: PromoClaim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PromoClaim" (
    id integer NOT NULL,
    "promoId" integer NOT NULL,
    "userId" integer NOT NULL,
    amount integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 286 (class 1259 OID 79163)
-- Name: PromoClaim_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PromoClaim_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6030 (class 0 OID 0)
-- Dependencies: 286
-- Name: PromoClaim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PromoClaim_id_seq" OWNED BY public."PromoClaim".id;


--
-- TOC entry 287 (class 1259 OID 79164)
-- Name: Promo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Promo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6031 (class 0 OID 0)
-- Dependencies: 287
-- Name: Promo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Promo_id_seq" OWNED BY public."Promo".id;


--
-- TOC entry 288 (class 1259 OID 79165)
-- Name: ProxmoxServer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProxmoxServer" (
    id integer NOT NULL,
    name text NOT NULL,
    host text NOT NULL,
    "tokenId" text NOT NULL,
    "tokenSecret" text NOT NULL,
    "backupStorage" text,
    "addonDiskStorages" text,
    "mainDiskStorage" text,
    "networkBridge" text DEFAULT 'vmbr0'::text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "primaryDns" text DEFAULT '8.8.8.8'::text,
    "secondaryDns" text DEFAULT '1.1.1.1'::text,
    "mainDiskStorageSsd" text,
    "publicNetworkBridge" text DEFAULT 'vmbr1'::text,
    password text,
    username text
);


--
-- TOC entry 289 (class 1259 OID 79184)
-- Name: ProxmoxServer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProxmoxServer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6032 (class 0 OID 0)
-- Dependencies: 289
-- Name: ProxmoxServer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProxmoxServer_id_seq" OWNED BY public."ProxmoxServer".id;


--
-- TOC entry 290 (class 1259 OID 79185)
-- Name: RegistrationOtp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RegistrationOtp" (
    id integer NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    code text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "referralCode" text,
    address1 text,
    address2 text,
    city text,
    "companyName" text,
    country text,
    phone text,
    "postalCode" text,
    state text
);


--
-- TOC entry 291 (class 1259 OID 79200)
-- Name: RegistrationOtp_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RegistrationOtp_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6033 (class 0 OID 0)
-- Dependencies: 291
-- Name: RegistrationOtp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RegistrationOtp_id_seq" OWNED BY public."RegistrationOtp".id;


--
-- TOC entry 292 (class 1259 OID 79201)
-- Name: ReservedIp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReservedIp" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "ipPoolId" integer NOT NULL,
    "ipAddress" text NOT NULL,
    "hourlyRate" integer DEFAULT 0 NOT NULL,
    "accumulatedCost" integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "isAttached" boolean DEFAULT false NOT NULL,
    "vpsId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    "terminationDate" timestamp(3) without time zone,
    "publicIp" text
);


--
-- TOC entry 293 (class 1259 OID 79221)
-- Name: ReservedIp_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ReservedIp_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6034 (class 0 OID 0)
-- Dependencies: 293
-- Name: ReservedIp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ReservedIp_id_seq" OWNED BY public."ReservedIp".id;


--
-- TOC entry 294 (class 1259 OID 79222)
-- Name: ResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ResetToken" (
    id integer NOT NULL,
    token text NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 295 (class 1259 OID 79233)
-- Name: ResetToken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ResetToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6035 (class 0 OID 0)
-- Dependencies: 295
-- Name: ResetToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ResetToken_id_seq" OWNED BY public."ResetToken".id;


--
-- TOC entry 296 (class 1259 OID 79234)
-- Name: SecureMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SecureMedia" (
    id integer NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "folderPath" text DEFAULT '/'::text NOT NULL,
    "isFolder" boolean DEFAULT false NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "userId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 297 (class 1259 OID 79253)
-- Name: SecureMedia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SecureMedia_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6036 (class 0 OID 0)
-- Dependencies: 297
-- Name: SecureMedia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SecureMedia_id_seq" OWNED BY public."SecureMedia".id;


--
-- TOC entry 298 (class 1259 OID 79254)
-- Name: Series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Series" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image text,
    level text DEFAULT 'Beginner'::text NOT NULL,
    tags text,
    published boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 299 (class 1259 OID 79270)
-- Name: Series_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Series_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6037 (class 0 OID 0)
-- Dependencies: 299
-- Name: Series_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Series_id_seq" OWNED BY public."Series".id;


--
-- TOC entry 300 (class 1259 OID 79271)
-- Name: Setting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Setting" (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL
);


--
-- TOC entry 301 (class 1259 OID 79279)
-- Name: Setting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Setting_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6038 (class 0 OID 0)
-- Dependencies: 301
-- Name: Setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Setting_id_seq" OWNED BY public."Setting".id;


--
-- TOC entry 302 (class 1259 OID 79280)
-- Name: ShortLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShortLink" (
    id integer NOT NULL,
    code text NOT NULL,
    url text NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "userId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 303 (class 1259 OID 79295)
-- Name: ShortLink_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ShortLink_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6039 (class 0 OID 0)
-- Dependencies: 303
-- Name: ShortLink_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ShortLink_id_seq" OWNED BY public."ShortLink".id;


--
-- TOC entry 304 (class 1259 OID 79296)
-- Name: Subscriber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subscriber" (
    id integer NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 305 (class 1259 OID 79305)
-- Name: Subscriber_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Subscriber_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6040 (class 0 OID 0)
-- Dependencies: 305
-- Name: Subscriber_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Subscriber_id_seq" OWNED BY public."Subscriber".id;


--
-- TOC entry 306 (class 1259 OID 79306)
-- Name: Subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subscription" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "planId" integer NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "suspendReason" text,
    cycle text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    "terminationDate" timestamp(3) without time zone,
    "lockedHourlyPrice" integer DEFAULT 0 NOT NULL,
    "lockedPrice" integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 307 (class 1259 OID 79329)
-- Name: Subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Subscription_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6041 (class 0 OID 0)
-- Dependencies: 307
-- Name: Subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Subscription_id_seq" OWNED BY public."Subscription".id;


--
-- TOC entry 308 (class 1259 OID 79330)
-- Name: SupportTicket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SupportTicket" (
    id integer NOT NULL,
    "ticketId" text NOT NULL,
    "userId" integer NOT NULL,
    subject text NOT NULL,
    service text,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "isReadByAdmin" boolean DEFAULT false NOT NULL,
    "isReadByUser" boolean DEFAULT true NOT NULL,
    "mergedIntoId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 309 (class 1259 OID 79350)
-- Name: SupportTicket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SupportTicket_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6042 (class 0 OID 0)
-- Dependencies: 309
-- Name: SupportTicket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SupportTicket_id_seq" OWNED BY public."SupportTicket".id;


--
-- TOC entry 310 (class 1259 OID 79351)
-- Name: Tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tag" (
    id integer NOT NULL,
    name text NOT NULL,
    slug text
);


--
-- TOC entry 311 (class 1259 OID 79358)
-- Name: Tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Tag_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6043 (class 0 OID 0)
-- Dependencies: 311
-- Name: Tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Tag_id_seq" OWNED BY public."Tag".id;


--
-- TOC entry 312 (class 1259 OID 79359)
-- Name: Testimonial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Testimonial" (
    id integer NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    text text NOT NULL,
    rating integer DEFAULT 5 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    image text
);


--
-- TOC entry 313 (class 1259 OID 79375)
-- Name: Testimonial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Testimonial_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6044 (class 0 OID 0)
-- Dependencies: 313
-- Name: Testimonial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Testimonial_id_seq" OWNED BY public."Testimonial".id;


--
-- TOC entry 314 (class 1259 OID 79376)
-- Name: TicketAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TicketAttachment" (
    id integer NOT NULL,
    "messageId" integer NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    path text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 315 (class 1259 OID 79390)
-- Name: TicketAttachment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TicketAttachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6045 (class 0 OID 0)
-- Dependencies: 315
-- Name: TicketAttachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TicketAttachment_id_seq" OWNED BY public."TicketAttachment".id;


--
-- TOC entry 316 (class 1259 OID 79391)
-- Name: TicketMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TicketMessage" (
    id integer NOT NULL,
    "ticketId" integer NOT NULL,
    "userId" integer NOT NULL,
    message text NOT NULL,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 317 (class 1259 OID 79404)
-- Name: TicketMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TicketMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6046 (class 0 OID 0)
-- Dependencies: 317
-- Name: TicketMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TicketMessage_id_seq" OWNED BY public."TicketMessage".id;


--
-- TOC entry 318 (class 1259 OID 79405)
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    image text,
    role text DEFAULT 'USER'::text NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isSuspended" boolean DEFAULT false NOT NULL,
    "suspendReason" text,
    balance integer DEFAULT 0 NOT NULL,
    "affiliateBalance" integer DEFAULT 0 NOT NULL,
    "referralCode" text,
    "referredById" integer,
    address1 text,
    address2 text,
    city text,
    "companyName" text,
    country text,
    phone text,
    "postalCode" text,
    state text,
    "isReseller" boolean DEFAULT false NOT NULL,
    "lastActive" timestamp(3) without time zone
);


--
-- TOC entry 319 (class 1259 OID 79429)
-- Name: UserVerificationOtp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserVerificationOtp" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    code text NOT NULL,
    type text DEFAULT 'CHANGE_PASSWORD'::text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 320 (class 1259 OID 79442)
-- Name: UserVerificationOtp_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UserVerificationOtp_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6047 (class 0 OID 0)
-- Dependencies: 320
-- Name: UserVerificationOtp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserVerificationOtp_id_seq" OWNED BY public."UserVerificationOtp".id;


--
-- TOC entry 321 (class 1259 OID 79443)
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6048 (class 0 OID 0)
-- Dependencies: 321
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- TOC entry 322 (class 1259 OID 79444)
-- Name: Voucher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Voucher" (
    id integer NOT NULL,
    code text NOT NULL,
    "discountPercent" integer NOT NULL,
    "maxUses" integer DEFAULT 0 NOT NULL,
    "currentUses" integer DEFAULT 0 NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text
);


--
-- TOC entry 323 (class 1259 OID 79461)
-- Name: VoucherUsage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VoucherUsage" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "voucherId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 324 (class 1259 OID 79469)
-- Name: VoucherUsage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VoucherUsage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6049 (class 0 OID 0)
-- Dependencies: 324
-- Name: VoucherUsage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VoucherUsage_id_seq" OWNED BY public."VoucherUsage".id;


--
-- TOC entry 325 (class 1259 OID 79470)
-- Name: Voucher_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Voucher_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6050 (class 0 OID 0)
-- Dependencies: 325
-- Name: Voucher_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Voucher_id_seq" OWNED BY public."Voucher".id;


--
-- TOC entry 326 (class 1259 OID 79471)
-- Name: VpcNetwork; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpcNetwork" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    cidr text NOT NULL,
    gateway text NOT NULL,
    "vlanId" integer NOT NULL,
    "userId" integer NOT NULL,
    "routerId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'PROVISIONING'::text NOT NULL,
    "isNatEnabled" boolean DEFAULT false NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 327 (class 1259 OID 79492)
-- Name: VpcNetwork_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpcNetwork_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6051 (class 0 OID 0)
-- Dependencies: 327
-- Name: VpcNetwork_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpcNetwork_id_seq" OWNED BY public."VpcNetwork".id;


--
-- TOC entry 328 (class 1259 OID 79493)
-- Name: VpcPeering; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpcPeering" (
    id integer NOT NULL,
    "vpcAId" integer NOT NULL,
    "vpcBId" integer NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 329 (class 1259 OID 79506)
-- Name: VpcPeering_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpcPeering_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6052 (class 0 OID 0)
-- Dependencies: 329
-- Name: VpcPeering_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpcPeering_id_seq" OWNED BY public."VpcPeering".id;


--
-- TOC entry 330 (class 1259 OID 79507)
-- Name: VpcRouter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpcRouter" (
    id integer NOT NULL,
    name text NOT NULL,
    host text NOT NULL,
    "apiPort" integer DEFAULT 8728 NOT NULL,
    "useSsl" boolean DEFAULT false NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "proxmoxBridge" text DEFAULT 'vmbr2'::text NOT NULL,
    "interfaceName" text DEFAULT 'ether3'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "wanInterface" text DEFAULT 'ether1'::text NOT NULL
);


--
-- TOC entry 331 (class 1259 OID 79530)
-- Name: VpcRouter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpcRouter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6053 (class 0 OID 0)
-- Dependencies: 331
-- Name: VpcRouter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpcRouter_id_seq" OWNED BY public."VpcRouter".id;


--
-- TOC entry 332 (class 1259 OID 79531)
-- Name: VpsAlertRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsAlertRule" (
    id integer NOT NULL,
    "vpsId" integer NOT NULL,
    metric text NOT NULL,
    threshold integer NOT NULL,
    "notifyEmails" text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "lastTriggeredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 333 (class 1259 OID 79546)
-- Name: VpsAlertRule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsAlertRule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6054 (class 0 OID 0)
-- Dependencies: 333
-- Name: VpsAlertRule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsAlertRule_id_seq" OWNED BY public."VpsAlertRule".id;


--
-- TOC entry 334 (class 1259 OID 79547)
-- Name: VpsIpAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsIpAssignment" (
    id integer NOT NULL,
    "vpsId" integer NOT NULL,
    "ipPoolId" integer NOT NULL,
    "ipAddress" text NOT NULL,
    "isPrimary" boolean DEFAULT true NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "publicIp" text
);


--
-- TOC entry 335 (class 1259 OID 79560)
-- Name: VpsIpAssignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsIpAssignment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6055 (class 0 OID 0)
-- Dependencies: 335
-- Name: VpsIpAssignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsIpAssignment_id_seq" OWNED BY public."VpsIpAssignment".id;


--
-- TOC entry 336 (class 1259 OID 79561)
-- Name: VpsPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsPlan" (
    id integer NOT NULL,
    name text NOT NULL,
    "cpuCores" integer NOT NULL,
    "ramGb" integer NOT NULL,
    "diskGb" integer NOT NULL,
    "monthlyPrice" double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "diskType" text DEFAULT 'HDD'::text NOT NULL,
    "annuallyPrice" double precision DEFAULT 0 NOT NULL,
    "quarterlyPrice" double precision DEFAULT 0 NOT NULL,
    "semiAnnuallyPrice" double precision DEFAULT 0 NOT NULL,
    "isReseller" boolean DEFAULT false NOT NULL
);


--
-- TOC entry 337 (class 1259 OID 79588)
-- Name: VpsPlan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsPlan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6056 (class 0 OID 0)
-- Dependencies: 337
-- Name: VpsPlan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsPlan_id_seq" OWNED BY public."VpsPlan".id;


--
-- TOC entry 338 (class 1259 OID 79589)
-- Name: VpsPricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsPricing" (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    "pricePerHour" integer NOT NULL,
    unit text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 339 (class 1259 OID 79602)
-- Name: VpsPricing_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsPricing_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6057 (class 0 OID 0)
-- Dependencies: 339
-- Name: VpsPricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsPricing_id_seq" OWNED BY public."VpsPricing".id;


--
-- TOC entry 340 (class 1259 OID 79603)
-- Name: VpsSchedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsSchedule" (
    id integer NOT NULL,
    "vpsId" integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    monday boolean DEFAULT true NOT NULL,
    tuesday boolean DEFAULT true NOT NULL,
    wednesday boolean DEFAULT true NOT NULL,
    thursday boolean DEFAULT true NOT NULL,
    friday boolean DEFAULT true NOT NULL,
    saturday boolean DEFAULT false NOT NULL,
    sunday boolean DEFAULT false NOT NULL,
    "startTime" text DEFAULT '08:00'::text NOT NULL,
    "stopTime" text DEFAULT '17:00'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 341 (class 1259 OID 79635)
-- Name: VpsSchedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsSchedule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6058 (class 0 OID 0)
-- Dependencies: 341
-- Name: VpsSchedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsSchedule_id_seq" OWNED BY public."VpsSchedule".id;


--
-- TOC entry 342 (class 1259 OID 79636)
-- Name: VpsService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsService" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "subscriptionId" integer,
    vmid integer,
    hostname text NOT NULL,
    "osTemplate" text NOT NULL,
    "rootPassword" text NOT NULL,
    "sshKey" text,
    "cpuCores" integer NOT NULL,
    "ramGb" integer NOT NULL,
    "diskGb" integer NOT NULL,
    "backupGb" integer DEFAULT 0 NOT NULL,
    "backupSchedule" text DEFAULT 'NONE'::text NOT NULL,
    "lastBackupRun" timestamp(3) without time zone,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "suspendReason" text,
    "hourlyRate" integer DEFAULT 0 NOT NULL,
    "accumulatedCost" integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    node text DEFAULT 'proxmox'::text NOT NULL,
    "networkBridge" text DEFAULT 'vmbr0'::text NOT NULL,
    "storageId" text DEFAULT 'local-lvm'::text NOT NULL,
    "kubernetesClusterId" integer,
    "kubernetesRole" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    username text DEFAULT 'root'::text NOT NULL,
    "vpcId" integer,
    "vpcIp" text,
    "diskType" text DEFAULT 'HDD'::text NOT NULL,
    "terminationDate" timestamp(3) without time zone,
    "isReseller" boolean DEFAULT false NOT NULL,
    "stoppedRate" integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 343 (class 1259 OID 79678)
-- Name: VpsService_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsService_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6059 (class 0 OID 0)
-- Dependencies: 343
-- Name: VpsService_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsService_id_seq" OWNED BY public."VpsService".id;


--
-- TOC entry 344 (class 1259 OID 79679)
-- Name: VpsTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VpsTemplate" (
    id integer NOT NULL,
    vmid integer NOT NULL,
    name text NOT NULL,
    "osType" text NOT NULL,
    image text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 345 (class 1259 OID 79693)
-- Name: VpsTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VpsTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6060 (class 0 OID 0)
-- Dependencies: 345
-- Name: VpsTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VpsTemplate_id_seq" OWNED BY public."VpsTemplate".id;


--
-- TOC entry 346 (class 1259 OID 79694)
-- Name: WithdrawalRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WithdrawalRequest" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "bankName" text NOT NULL,
    "accountNumber" text NOT NULL,
    "accountName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 347 (class 1259 OID 79710)
-- Name: WithdrawalRequest_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."WithdrawalRequest_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6061 (class 0 OID 0)
-- Dependencies: 347
-- Name: WithdrawalRequest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."WithdrawalRequest_id_seq" OWNED BY public."WithdrawalRequest".id;


--
-- TOC entry 5175 (class 2604 OID 79711)
-- Name: AffiliateEarning id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AffiliateEarning" ALTER COLUMN id SET DEFAULT nextval('public."AffiliateEarning_id_seq"'::regclass);


--
-- TOC entry 5177 (class 2604 OID 79712)
-- Name: Announcement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement" ALTER COLUMN id SET DEFAULT nextval('public."Announcement_id_seq"'::regclass);


--
-- TOC entry 5181 (class 2604 OID 79713)
-- Name: ApiKey id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiKey" ALTER COLUMN id SET DEFAULT nextval('public."ApiKey_id_seq"'::regclass);


--
-- TOC entry 5185 (class 2604 OID 79714)
-- Name: ApiProject id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiProject" ALTER COLUMN id SET DEFAULT nextval('public."ApiProject_id_seq"'::regclass);


--
-- TOC entry 5189 (class 2604 OID 79715)
-- Name: BackgroundJob id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BackgroundJob" ALTER COLUMN id SET DEFAULT nextval('public."BackgroundJob_id_seq"'::regclass);


--
-- TOC entry 5193 (class 2604 OID 79716)
-- Name: Banner id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Banner" ALTER COLUMN id SET DEFAULT nextval('public."Banner_id_seq"'::regclass);


--
-- TOC entry 5196 (class 2604 OID 79717)
-- Name: BlockedUser id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlockedUser" ALTER COLUMN id SET DEFAULT nextval('public."BlockedUser_id_seq"'::regclass);


--
-- TOC entry 5198 (class 2604 OID 79718)
-- Name: BlogCategory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogCategory" ALTER COLUMN id SET DEFAULT nextval('public."BlogCategory_id_seq"'::regclass);


--
-- TOC entry 5199 (class 2604 OID 79719)
-- Name: BlogPost id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPost" ALTER COLUMN id SET DEFAULT nextval('public."BlogPost_id_seq"'::regclass);


--
-- TOC entry 5203 (class 2604 OID 79720)
-- Name: BlogReaction id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogReaction" ALTER COLUMN id SET DEFAULT nextval('public."BlogReaction_id_seq"'::regclass);


--
-- TOC entry 5205 (class 2604 OID 79721)
-- Name: Certification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Certification" ALTER COLUMN id SET DEFAULT nextval('public."Certification_id_seq"'::regclass);


--
-- TOC entry 5208 (class 2604 OID 79722)
-- Name: ChatMessage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage" ALTER COLUMN id SET DEFAULT nextval('public."ChatMessage_id_seq"'::regclass);


--
-- TOC entry 5213 (class 2604 OID 79723)
-- Name: ChatSession id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatSession" ALTER COLUMN id SET DEFAULT nextval('public."ChatSession_id_seq"'::regclass);


--
-- TOC entry 5218 (class 2604 OID 79724)
-- Name: CloudflareDomain id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CloudflareDomain" ALTER COLUMN id SET DEFAULT nextval('public."CloudflareDomain_id_seq"'::regclass);


--
-- TOC entry 5221 (class 2604 OID 79725)
-- Name: CloudflareTunnel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CloudflareTunnel" ALTER COLUMN id SET DEFAULT nextval('public."CloudflareTunnel_id_seq"'::regclass);


--
-- TOC entry 5223 (class 2604 OID 79726)
-- Name: Comment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment" ALTER COLUMN id SET DEFAULT nextval('public."Comment_id_seq"'::regclass);


--
-- TOC entry 5227 (class 2604 OID 79727)
-- Name: CommunityGroup id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityGroup" ALTER COLUMN id SET DEFAULT nextval('public."CommunityGroup_id_seq"'::regclass);


--
-- TOC entry 5230 (class 2604 OID 79728)
-- Name: CustomService id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomService" ALTER COLUMN id SET DEFAULT nextval('public."CustomService_id_seq"'::regclass);


--
-- TOC entry 5235 (class 2604 OID 79729)
-- Name: Education id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Education" ALTER COLUMN id SET DEFAULT nextval('public."Education_id_seq"'::regclass);


--
-- TOC entry 5238 (class 2604 OID 79730)
-- Name: Episode id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Episode" ALTER COLUMN id SET DEFAULT nextval('public."Episode_id_seq"'::regclass);


--
-- TOC entry 5242 (class 2604 OID 79731)
-- Name: Experience id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Experience" ALTER COLUMN id SET DEFAULT nextval('public."Experience_id_seq"'::regclass);


--
-- TOC entry 5245 (class 2604 OID 79732)
-- Name: Invoice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice" ALTER COLUMN id SET DEFAULT nextval('public."Invoice_id_seq"'::regclass);


--
-- TOC entry 5253 (class 2604 OID 79733)
-- Name: IpPool id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IpPool" ALTER COLUMN id SET DEFAULT nextval('public."IpPool_id_seq"'::regclass);


--
-- TOC entry 5257 (class 2604 OID 79734)
-- Name: KubernetesCluster id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KubernetesCluster" ALTER COLUMN id SET DEFAULT nextval('public."KubernetesCluster_id_seq"'::regclass);


--
-- TOC entry 5261 (class 2604 OID 79735)
-- Name: LoginLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LoginLog" ALTER COLUMN id SET DEFAULT nextval('public."LoginLog_id_seq"'::regclass);


--
-- TOC entry 5265 (class 2604 OID 79736)
-- Name: Message id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message" ALTER COLUMN id SET DEFAULT nextval('public."Message_id_seq"'::regclass);


--
-- TOC entry 5269 (class 2604 OID 79737)
-- Name: Opportunity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Opportunity" ALTER COLUMN id SET DEFAULT nextval('public."Opportunity_id_seq"'::regclass);


--
-- TOC entry 5273 (class 2604 OID 79738)
-- Name: PageView id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PageView" ALTER COLUMN id SET DEFAULT nextval('public."PageView_id_seq"'::regclass);


--
-- TOC entry 5275 (class 2604 OID 79739)
-- Name: PaymentMethod id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentMethod" ALTER COLUMN id SET DEFAULT nextval('public."PaymentMethod_id_seq"'::regclass);


--
-- TOC entry 5279 (class 2604 OID 79740)
-- Name: Plan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Plan" ALTER COLUMN id SET DEFAULT nextval('public."Plan_id_seq"'::regclass);


--
-- TOC entry 5284 (class 2604 OID 79741)
-- Name: Project id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project" ALTER COLUMN id SET DEFAULT nextval('public."Project_id_seq"'::regclass);


--
-- TOC entry 5287 (class 2604 OID 79742)
-- Name: ProjectCategory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectCategory" ALTER COLUMN id SET DEFAULT nextval('public."ProjectCategory_id_seq"'::regclass);


--
-- TOC entry 5288 (class 2604 OID 79743)
-- Name: Promo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Promo" ALTER COLUMN id SET DEFAULT nextval('public."Promo_id_seq"'::regclass);


--
-- TOC entry 5295 (class 2604 OID 79744)
-- Name: PromoClaim id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PromoClaim" ALTER COLUMN id SET DEFAULT nextval('public."PromoClaim_id_seq"'::regclass);


--
-- TOC entry 5297 (class 2604 OID 79745)
-- Name: ProxmoxServer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProxmoxServer" ALTER COLUMN id SET DEFAULT nextval('public."ProxmoxServer_id_seq"'::regclass);


--
-- TOC entry 5304 (class 2604 OID 79746)
-- Name: RegistrationOtp id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistrationOtp" ALTER COLUMN id SET DEFAULT nextval('public."RegistrationOtp_id_seq"'::regclass);


--
-- TOC entry 5307 (class 2604 OID 79747)
-- Name: ReservedIp id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservedIp" ALTER COLUMN id SET DEFAULT nextval('public."ReservedIp_id_seq"'::regclass);


--
-- TOC entry 5313 (class 2604 OID 79748)
-- Name: ResetToken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResetToken" ALTER COLUMN id SET DEFAULT nextval('public."ResetToken_id_seq"'::regclass);


--
-- TOC entry 5315 (class 2604 OID 79749)
-- Name: SecureMedia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SecureMedia" ALTER COLUMN id SET DEFAULT nextval('public."SecureMedia_id_seq"'::regclass);


--
-- TOC entry 5320 (class 2604 OID 79750)
-- Name: Series id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Series" ALTER COLUMN id SET DEFAULT nextval('public."Series_id_seq"'::regclass);


--
-- TOC entry 5324 (class 2604 OID 79751)
-- Name: Setting id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Setting" ALTER COLUMN id SET DEFAULT nextval('public."Setting_id_seq"'::regclass);


--
-- TOC entry 5325 (class 2604 OID 79752)
-- Name: ShortLink id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShortLink" ALTER COLUMN id SET DEFAULT nextval('public."ShortLink_id_seq"'::regclass);


--
-- TOC entry 5329 (class 2604 OID 79753)
-- Name: Subscriber id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscriber" ALTER COLUMN id SET DEFAULT nextval('public."Subscriber_id_seq"'::regclass);


--
-- TOC entry 5331 (class 2604 OID 79754)
-- Name: Subscription id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription" ALTER COLUMN id SET DEFAULT nextval('public."Subscription_id_seq"'::regclass);


--
-- TOC entry 5338 (class 2604 OID 79755)
-- Name: SupportTicket id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportTicket" ALTER COLUMN id SET DEFAULT nextval('public."SupportTicket_id_seq"'::regclass);


--
-- TOC entry 5344 (class 2604 OID 79756)
-- Name: Tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag" ALTER COLUMN id SET DEFAULT nextval('public."Tag_id_seq"'::regclass);


--
-- TOC entry 5345 (class 2604 OID 79757)
-- Name: Testimonial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Testimonial" ALTER COLUMN id SET DEFAULT nextval('public."Testimonial_id_seq"'::regclass);


--
-- TOC entry 5349 (class 2604 OID 79758)
-- Name: TicketAttachment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketAttachment" ALTER COLUMN id SET DEFAULT nextval('public."TicketAttachment_id_seq"'::regclass);


--
-- TOC entry 5351 (class 2604 OID 79759)
-- Name: TicketMessage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketMessage" ALTER COLUMN id SET DEFAULT nextval('public."TicketMessage_id_seq"'::regclass);


--
-- TOC entry 5354 (class 2604 OID 79760)
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- TOC entry 5362 (class 2604 OID 79761)
-- Name: UserVerificationOtp id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserVerificationOtp" ALTER COLUMN id SET DEFAULT nextval('public."UserVerificationOtp_id_seq"'::regclass);


--
-- TOC entry 5365 (class 2604 OID 79762)
-- Name: Voucher id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Voucher" ALTER COLUMN id SET DEFAULT nextval('public."Voucher_id_seq"'::regclass);


--
-- TOC entry 5370 (class 2604 OID 79763)
-- Name: VoucherUsage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoucherUsage" ALTER COLUMN id SET DEFAULT nextval('public."VoucherUsage_id_seq"'::regclass);


--
-- TOC entry 5372 (class 2604 OID 79764)
-- Name: VpcNetwork id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcNetwork" ALTER COLUMN id SET DEFAULT nextval('public."VpcNetwork_id_seq"'::regclass);


--
-- TOC entry 5377 (class 2604 OID 79765)
-- Name: VpcPeering id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcPeering" ALTER COLUMN id SET DEFAULT nextval('public."VpcPeering_id_seq"'::regclass);


--
-- TOC entry 5380 (class 2604 OID 79766)
-- Name: VpcRouter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcRouter" ALTER COLUMN id SET DEFAULT nextval('public."VpcRouter_id_seq"'::regclass);


--
-- TOC entry 5387 (class 2604 OID 79767)
-- Name: VpsAlertRule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsAlertRule" ALTER COLUMN id SET DEFAULT nextval('public."VpsAlertRule_id_seq"'::regclass);


--
-- TOC entry 5390 (class 2604 OID 79768)
-- Name: VpsIpAssignment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsIpAssignment" ALTER COLUMN id SET DEFAULT nextval('public."VpsIpAssignment_id_seq"'::regclass);


--
-- TOC entry 5393 (class 2604 OID 79769)
-- Name: VpsPlan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsPlan" ALTER COLUMN id SET DEFAULT nextval('public."VpsPlan_id_seq"'::regclass);


--
-- TOC entry 5402 (class 2604 OID 79770)
-- Name: VpsPricing id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsPricing" ALTER COLUMN id SET DEFAULT nextval('public."VpsPricing_id_seq"'::regclass);


--
-- TOC entry 5404 (class 2604 OID 79771)
-- Name: VpsSchedule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsSchedule" ALTER COLUMN id SET DEFAULT nextval('public."VpsSchedule_id_seq"'::regclass);


--
-- TOC entry 5417 (class 2604 OID 79772)
-- Name: VpsService id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsService" ALTER COLUMN id SET DEFAULT nextval('public."VpsService_id_seq"'::regclass);


--
-- TOC entry 5432 (class 2604 OID 79773)
-- Name: VpsTemplate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsTemplate" ALTER COLUMN id SET DEFAULT nextval('public."VpsTemplate_id_seq"'::regclass);


--
-- TOC entry 5435 (class 2604 OID 79774)
-- Name: WithdrawalRequest id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WithdrawalRequest" ALTER COLUMN id SET DEFAULT nextval('public."WithdrawalRequest_id_seq"'::regclass);


--
-- TOC entry 5864 (class 0 OID 78625)
-- Dependencies: 219
-- Data for Name: AffiliateEarning; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AffiliateEarning" (id, "referrerId", "referredId", amount, description, "createdAt") FROM stdin;
2	5	13	5000	Commission from first VPS purchase by Marlin Hidayat Tanjung 	2026-09-12 18:06:05.19
\.


--
-- TOC entry 5866 (class 0 OID 78637)
-- Dependencies: 221
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Announcement" (id, title, content, type, "isActive", "createdAt", "updatedAt", "actionUrl", "imageUrl") FROM stdin;
4	Diskon Akhir Tahun 50%	<p>Jangan lewatkan promo spesial akhir tahun kami! Dapatkan diskon hingga 50% untuk semua pembelian layanan Cloud VPS dan Managed Kubernetes selama bulan Desember.</p><p>Promo ini berlaku bagi pengguna baru maupun lama. Gunakan kode promo <b>AKHIRTAHUN50</b> saat melakukan pembayaran.</p>	INFO	t	2026-09-17 01:21:44.204	2026-09-17 01:21:44.204	\N	\N
5	Fitur Baru: Object Storage S3	<p>Kami dengan senang hati mengumumkan peluncuran fitur terbaru kami: <b>Object Storage (S3 Compatible)</b>.</p><p>Sekarang Anda dapat menyimpan aset statis, backup, dan file media Anda dengan aman, cepat, dan murah. Akses langsung melalui dashboard kontrol panel Anda hari ini juga!</p>	INFO	t	2026-09-17 01:21:44.204	2026-09-17 01:21:44.204	\N	\N
6	Peningkatan Infrastruktur Jaringan	<!-- state:{"maintenanceDesc":"Untuk meningkatkan kualitas dan keandalan layanan kami, kami baru saja melakukan upgrade pada infrastruktur jaringan core kami di Data Center tier 3.Dengan pembaruan ini, seluruh pelanggan akan merasakan peningkatan kecepatan dan penurunan latensi yang signifikan.","simpleContent":"Untuk meningkatkan kualitas dan keandalan layanan kami, kami baru saja melakukan upgrade pada infrastruktur jaringan core kami. Dengan pembaruan ini, seluruh pelanggan akan merasakan peningkatan kecepatan dan penurunan latensi yang signifikan.","maintenanceStart":"","maintenanceEnd":"","maintenanceImpact":"Mungkin terjadi interupsi layanan"} -->\n<p>Untuk meningkatkan kualitas dan keandalan layanan kami, kami baru saja melakukan upgrade pada infrastruktur jaringan core kami. Dengan pembaruan ini, seluruh pelanggan akan merasakan peningkatan kecepatan dan penurunan latensi yang signifikan.</p>	INFO	t	2026-09-17 01:21:44.204	2026-09-17 06:23:12.672		
8	Emergency Maintenance: Penambahan RAM Server	<!-- state:{"maintenanceDesc":"Kami informasikan bahwa tim NOC Masdika akan melaksanakan kegiatan penambahan kapasitas RAM pada server. Kegiatan ini dilakukan untuk meningkatkan kapasitas resource server serta menjaga performa dan stabilitas layanan yang berjalan.\\n\\nKegiatan ini rencananya akan dilakukan pada:\\n\\nDampak:\\nSelama periode pemeliharaan, layanan yang Anda gunakan kemungkinan tidak dapat diakses sementara selama proses penambahan RAM berlangsung.\\n\\nKami mohon maaf atas ketidaknyamanan yang mungkin timbul akibat kegiatan ini. Tim kami akan berupaya menyelesaikan proses maintenance secepat mungkin agar layanan dapat kembali normal.","simpleContent":"Kami informasikan bahwa tim NOC Rumahweb akan melaksanakan kegiatan upgrade firmware perangkat network yang berada di Data Center Biznet Technovillage. Hal ini dilakukan sebagai bentuk komitmen kami untuk memastikan bahwa layanan yang kami sampaikan tetap dalam kondisi terbaik.\\n\\n\\nKegiatan ini rencananya akan dilakukan pada:\\n\\n\\n\\nDampak:\\nSelama periode pemeliharaan, layanan yang Anda gunakan kemungkinan tidak dapat diakses selama sekitar 1 - 3 jam.\\n\\n\\nKami mohon maaf atas ketidaknyamanan yang mungkin timbul akibat kegiatan ini. Tim kami akan berupaya menyelesaikan proses maintenance secepat mungkin agar layanan dapat kembali normal.","maintenanceStart":"2026-09-26T21:00","maintenanceEnd":"2026-09-26T23:00","maintenanceImpact":"Terjadi downtime beberapa waktu"} -->\n<p>Salam,</p>\n<br/>\n<p>Kami informasikan bahwa tim NOC Masdika akan melaksanakan kegiatan penambahan kapasitas RAM pada server. Kegiatan ini dilakukan untuk meningkatkan kapasitas resource server serta menjaga performa dan stabilitas layanan yang berjalan.\n\nKegiatan ini rencananya akan dilakukan pada:\n\nDampak:\nSelama periode pemeliharaan, layanan yang Anda gunakan kemungkinan tidak dapat diakses sementara selama proses penambahan RAM berlangsung.\n\nKami mohon maaf atas ketidaknyamanan yang mungkin timbul akibat kegiatan ini. Tim kami akan berupaya menyelesaikan proses maintenance secepat mungkin agar layanan dapat kembali normal.</p>\n<br/>\n<table>\n  <thead>\n    <tr>\n      <th style="width: 30%; text-align: left;">Item</th>\n      <th style="text-align: left;">Keterangan</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Tanggal Mulai</td>\n      <td>26 September 2026 pukul 21.00</td>\n    </tr>\n    <tr>\n      <td>Tanggal Selesai</td>\n      <td>26 September 2026 pukul 23.00</td>\n    </tr>\n    <tr>\n      <td>Dampak Layanan</td>\n      <td>Terjadi downtime beberapa waktu</td>\n    </tr>\n  </tbody>\n</table>\n<br/>\n<p>Demikian informasi ini kami sampaikan. Jika ada pertanyaan, jangan ragu menghubungi tim support kami.</p>\n<p>Terima kasih,</p>	MAINTENANCE	t	2026-09-17 01:51:41.847	2026-09-26 08:08:48.447		
\.


--
-- TOC entry 5868 (class 0 OID 78653)
-- Dependencies: 223
-- Data for Name: ApiKey; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiKey" (id, name, key, "userId", "projectId", service, "usageCount", status, "createdAt", "lastUsed") FROM stdin;
\.


--
-- TOC entry 5870 (class 0 OID 78668)
-- Dependencies: 225
-- Data for Name: ApiProject; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiProject" (id, slug, name, description, icon, endpoint, method, category, "isPremium", "createdAt", "updatedAt") FROM stdin;
6	cdn	Masdika CDN	Secure Content Delivery Network for Masdika platform. Allows you to upload files via POST and fetch temporary files via GET. Max upload size 100MB.	download	https://www.masdika.id/api/public/upload	POST	Storage	f	2026-06-25 00:08:09.307	2026-06-27 23:00:39.207
7	blog	Masdika Blog API	Access published blog posts from Masdika. Fetch a list of posts with pagination, filter by category or tag, search by keyword, or retrieve a single post by slug.	echo	https://www.masdika.id/api/blog	GET	Content	f	2026-06-25 08:14:04.09	2026-06-27 23:00:39.216
8	shortener	Masdika URL Shortener API	Create and manage shortened URLs programmatically. Accepts a long URL and returns an auto-generated short link. Requires API Key authentication.	echo	https://www.masdika.id/api/shortener	POST	Tools	f	2026-06-26 16:51:56.49	2026-06-27 23:00:39.227
9	youtube-downloader	YouTube Downloader API	Extract video metadata and direct MP4/MP3 download links from YouTube. Fast and reliable stream extraction.	download	https://www.masdika.id/api/downloader/youtube	POST	Downloader	f	2026-06-26 17:01:53.747	2026-06-27 23:00:39.235
10	tiktok-downloader	TikTok Downloader API	Download TikTok videos without watermark and extract MP3 audio. High-quality instant processing.	download	https://www.masdika.id/api/downloader/tiktok	POST	Downloader	f	2026-06-26 17:01:54.041	2026-06-27 23:00:39.243
11	spotify-downloader	Spotify Downloader API	Download Spotify tracks directly in high quality (MP3). Easy, fast, and secure API for developers.	download	https://www.masdika.id/api/downloader/spotify	POST	Downloader	f	2026-06-27 14:39:49.692	2026-06-27 23:00:39.252
12	bmkg-weather	BMKG Weather API	Get real-time weather forecasts for all regions in Indonesia directly from BMKG (Meteorology, Climatology, and Geophysical Agency). The response is formatted in clean JSON for easy integration with your applications.	cloud	/api/public/bmkg/weather	GET	Data & Analytics	t	2026-06-30 19:17:00.286	2026-06-30 19:22:25.691
13	bmkg-earthquake	BMKG Earthquake API	Get the latest earthquake information (Auto Gempa) and a list of recent earthquakes > 5.0 SR from BMKG. The response includes shakemap image links.	activity	/api/public/bmkg/earthquake	GET	Data & Analytics	t	2026-06-30 19:17:00.315	2026-06-30 19:22:25.719
\.


--
-- TOC entry 5872 (class 0 OID 78687)
-- Dependencies: 227
-- Data for Name: BackgroundJob; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BackgroundJob" (id, type, payload, status, error, attempts, "createdAt", "updatedAt") FROM stdin;
1	PROVISION_VPS	{"vpsId":42,"options":{"ipv4Count":0,"ipv6Count":0,"reservedIpId":4,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":false,"source":"anywhere","customIp":""},"https":{"enabled":false,"source":"anywhere","customIp":""}},"vpcId":66},"userId":5,"hourlyRate":68}	COMPLETED	\N	1	2026-09-09 00:31:23.019	2026-09-09 00:32:28.211
2	PROVISION_VPS	{"vpsId":43,"options":{"ipv4Count":0,"ipv6Count":0,"reservedIpId":4,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":66},"userId":5,"hourlyRate":68}	COMPLETED	\N	1	2026-09-09 00:47:02.904	2026-09-09 00:48:00.24
3	PROVISION_VPC	{"vpcId":82}	FAILED	Unknown job type: PROVISION_VPC	1	2026-09-09 09:44:00.518	2026-09-09 09:44:03.137
4	PROVISION_VPS	{"vpsId":44,"options":{"ipv4Count":1,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":false,"source":"anywhere","customIp":""},"https":{"enabled":false,"source":"anywhere","customIp":""}},"vpcId":85},"userId":5,"hourlyRate":138}	COMPLETED	\N	1	2026-09-09 09:57:13.477	2026-09-09 09:58:15.948
5	PROVISION_VPS	{"vpsId":45,"options":{"ipv4Count":1,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":false,"source":"anywhere","customIp":""},"https":{"enabled":false,"source":"anywhere","customIp":""}},"vpcId":86},"userId":5,"hourlyRate":138}	COMPLETED	\N	1	2026-09-09 10:00:37.057	2026-09-09 10:01:33.967
6	PROVISION_VPS	{"vpsId":46,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":93},"userId":5,"hourlyRate":118}	COMPLETED	\N	1	2026-09-09 12:34:47.05	2026-09-09 12:35:49.027
7	PROVISION_VPS	{"vpsId":47,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":false,"source":"anywhere","customIp":""},"https":{"enabled":false,"source":"anywhere","customIp":""}},"vpcId":94},"userId":5,"hourlyRate":68}	COMPLETED	\N	1	2026-09-09 13:12:19.482	2026-09-09 13:13:21.908
8	PROVISION_VPS	{"vpsId":48,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":false,"source":"anywhere","customIp":""},"https":{"enabled":false,"source":"anywhere","customIp":""}},"vpcId":95},"userId":5,"hourlyRate":68}	COMPLETED	\N	1	2026-09-10 03:50:08.277	2026-09-10 03:51:14.47
9	PROVISION_VPS	{"vpsId":49,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"182.9.50.12/32","customIp":""},"http":{"enabled":true,"source":"182.9.50.12/32","customIp":""},"https":{"enabled":true,"source":"182.9.50.12/32","customIp":""}}},"userId":13,"hourlyRate":68}	COMPLETED	\N	1	2026-09-12 18:06:05.204	2026-09-12 18:08:12.061
10	PROVISION_VPS	{"vpsId":50,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"custom","customIp":"103.150.60.10"},"http":{"enabled":true,"source":"custom","customIp":"103.150.60.10"},"https":{"enabled":true,"source":"custom","customIp":"103.150.60.10"}},"vpcId":97},"userId":13,"hourlyRate":71}	COMPLETED	\N	1	2026-09-13 15:08:22.666	2026-09-13 15:10:32.715
11	PROVISION_VPS	{"vpsId":51,"options":{"ipv4Count":1,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":98},"userId":5,"hourlyRate":91}	COMPLETED	\N	1	2026-09-22 04:35:42.938	2026-09-22 04:36:47.621
12	PROVISION_VPS	{"vpsId":52,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":99},"userId":27,"hourlyRate":71}	COMPLETED	\N	1	2026-09-23 03:57:27.135	2026-09-23 03:59:35.437
13	PROVISION_VPS	{"vpsId":53,"options":{"ipv4Count":1,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":100},"userId":27,"hourlyRate":91}	COMPLETED	\N	1	2026-09-23 07:14:59.54	2026-09-23 07:16:07.909
14	PROVISION_VPS	{"vpsId":54,"options":{"ipv4Count":0,"ipv6Count":0,"reservedIpId":6,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":false,"source":"anywhere","customIp":""},"https":{"enabled":false,"source":"anywhere","customIp":""}},"vpcId":98},"userId":5,"hourlyRate":71}	COMPLETED	\N	1	2026-09-23 08:02:20.738	2026-09-23 08:03:27.135
15	PROVISION_VPS	{"vpsId":55,"options":{"ipv4Count":0,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":101},"userId":5,"hourlyRate":71}	COMPLETED	\N	1	2026-09-25 08:57:19.193	2026-09-25 09:00:13.186
16	PROVISION_VPS	{"vpsId":56,"options":{"ipv4Count":1,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":101},"userId":5,"hourlyRate":91}	COMPLETED	\N	1	2026-10-06 12:09:48.148	2026-10-06 12:10:53.949
17	PROVISION_VPS	{"vpsId":57,"options":{"ipv4Count":1,"ipv6Count":0,"firewallRules":{"ssh":{"enabled":true,"source":"anywhere","customIp":""},"http":{"enabled":true,"source":"anywhere","customIp":""},"https":{"enabled":true,"source":"anywhere","customIp":""}},"vpcId":101},"userId":5,"hourlyRate":91}	COMPLETED	\N	1	2026-10-06 12:15:07.522	2026-10-06 12:16:10.55
\.


--
-- TOC entry 5874 (class 0 OID 78703)
-- Dependencies: 229
-- Data for Name: Banner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Banner" (id, title, "imageUrl", "actionUrl", "isActive", "createdAt", "updatedAt") FROM stdin;
3	File CDN	/uploads/banners/banners-1789616237209.webp	/dashboard/checkout	t	2026-09-17 03:37:38.217	2026-09-17 06:15:57.772
1	VPS	/uploads/banners/banners-1789612817600.webp	/dashboard/checkout	t	2026-09-17 02:35:09.915	2026-09-17 06:16:00.359
4	Clodflare Tunnel	/uploads/banners/banners-1790372203746.webp	/dashboard/cloudflared	t	2026-09-25 21:31:40.674	2026-09-25 21:36:45.069
5	Auto Scheduler	/uploads/banners/banners-1790372456383.webp	/dashboard/scheduler	t	2026-09-25 21:34:06.275	2026-09-25 21:40:57.983
\.


--
-- TOC entry 5876 (class 0 OID 78717)
-- Dependencies: 231
-- Data for Name: BlockedUser; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BlockedUser" (id, type, value, reason, "createdAt", "updatedAt") FROM stdin;
1	IP	2404:c0:3179:6cad:a90f:7a94:fdf8:c42b	Brute force login attempts (Max 5x)	2026-09-22 23:35:02.585	2026-09-22 23:35:02.585
\.


--
-- TOC entry 5878 (class 0 OID 78729)
-- Dependencies: 233
-- Data for Name: BlogCategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BlogCategory" (id, name, slug) FROM stdin;
2	Technology	technology
5	Cloud Native	cloud native
6	Architecture	architecture
7	DevOps	devops
8	Aws	aws
\.


--
-- TOC entry 5880 (class 0 OID 78737)
-- Dependencies: 235
-- Data for Name: BlogPost; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BlogPost" (id, title, slug, excerpt, content, image, published, "readTime", "categoryId", "authorId", "createdAt", "updatedAt") FROM stdin;
15	Lulus AWS Certification dengan Skor 750? Ini Arti Sebenarnya dan Cara AWS Menghitung Nilai Ujian	lulus-aws-certification-dengan-skor-750-ini-arti-sebenarnya-dan-cara-aws-menghitung-nilai-ujian	Bingung dengan skor AWS Certification? Pelajari arti sebenarnya dari scaled scoring, passing score 700, 720, dan 750, serta cara AWS menghitung nilai ujian sertifikasi.	Bagi banyak peserta AWS Certification, momen yang paling menegangkan bukan saat menjawab soal, melainkan ketika hasil ujian akhirnya keluar.\n\nSetelah melihat status **Pass** atau **Fail**, biasanya muncul pertanyaan yang sama:\n\n:::note\n"Saya dapat skor 750. Berarti saya menjawab 75% soal dengan benar, kan?"\n:::\n\nTernyata jawabannya **tidak sesederhana itu**.\n\nBerbeda dengan ujian sekolah atau kampus yang umumnya menggunakan persentase nilai, AWS Certification menggunakan sistem yang disebut **scaled scoring** atau skor berskala. Karena itulah, angka yang muncul pada laporan hasil ujian tidak bisa langsung diterjemahkan menjadi persentase jawaban benar.\n\nMari kita bahas dengan bahasa yang lebih mudah dipahami.\n\n## Kenapa Skor AWS Tidak Sama dengan Persentase Nilai?\n\nSaat sekolah dulu, sistem penilaian sangat sederhana.\n\n* Nilai 90 berarti sekitar 90% jawaban benar.\n* Nilai 80 berarti sekitar 80% jawaban benar.\n* Dan seterusnya.\n\nNamun AWS Certification bekerja dengan cara yang berbeda.\n\nPada laporan hasil ujian, peserta akan mendapatkan skor dalam rentang **100 hingga 1.000**. Sebagai contoh, seseorang mungkin memperoleh skor **836** dan dinyatakan lulus.\n\nBanyak orang mengira angka tersebut berarti 83,6% jawaban benar. Padahal kenyataannya tidak demikian.\n\nAWS menggunakan sistem penilaian khusus agar hasil ujian tetap adil meskipun setiap peserta mendapatkan kombinasi soal yang berbeda.\n\n## Apa Itu Scaled Scoring?\n\nAWS memiliki banyak variasi soal untuk satu jenis ujian yang sama.\n\nMisalnya, dua peserta mengikuti ujian AWS Certified Cloud Practitioner pada hari yang sama. Walaupun blueprint dan materi yang diujikan identik, paket soal yang mereka terima bisa berbeda.\n\nAda kemungkinan:\n\n* Peserta A mendapatkan paket soal yang relatif lebih mudah.\n* Peserta B mendapatkan paket soal yang sedikit lebih sulit.\n\nJika AWS hanya menghitung jumlah jawaban benar secara mentah (raw score), maka peserta yang mendapatkan soal lebih sulit akan dirugikan.\n\nUntuk itulah digunakan **scaled scoring**.\n\nSistem ini memastikan bahwa tingkat kemampuan yang diukur tetap sama, meskipun tingkat kesulitan soal yang diterima setiap peserta sedikit berbeda.\n\nDengan kata lain, dua peserta yang memperoleh skor akhir yang sama dianggap memiliki tingkat kompetensi yang setara, walaupun jumlah jawaban benarnya belum tentu sama.\n\n## Passing Score AWS Certification\n\nAWS menetapkan passing score yang berbeda untuk setiap level sertifikasi.\n\n### Foundational Level\n\nContohnya:\n\n* AWS Certified Cloud Practitioner (CLF-C02)\n\nPassing score: **700**\n\n### Associate Level\n\nContohnya:\n\n* Solutions Architect Associate\n* Developer Associate\n* SysOps Administrator Associate\n\nPassing score: **720**\n\n### Professional dan Specialty Level\n\nContohnya:\n\n* Solutions Architect Professional\n* DevOps Engineer Professional\n* Security Specialty\n* Advanced Networking Specialty\n\nPassing score: **750**\n\nPenting untuk dipahami bahwa angka tersebut merupakan **scaled score**, bukan persentase jawaban benar.\n\nArtinya, tidak ada rumus pasti seperti:\n\n:::note\n"Kalau passing score 700 berarti harus benar 70%."\n:::\n\nKarena jumlah jawaban benar yang dibutuhkan dapat berbeda tergantung tingkat kesulitan paket soal yang diterima.\n\n## AWS Juga Menyisipkan Soal yang Tidak Dinilai\n\nFakta menarik lainnya, tidak semua soal dalam ujian AWS benar-benar memengaruhi nilai akhir Anda.\n\nBeberapa soal merupakan **unscored questions** atau soal yang tidak dinilai.\n\nSoal-soal ini digunakan AWS untuk menguji kualitas pertanyaan baru sebelum resmi digunakan pada ujian berikutnya.\n\nKarakteristiknya:\n\n* Tampil seperti soal biasa.\n* Tidak memengaruhi nilai akhir.\n* Digunakan untuk pengumpulan data statistik.\n* Peserta tidak akan tahu soal mana yang termasuk kategori ini.\n\nMengapa AWS melakukannya?\n\nKarena sebelum sebuah soal digunakan secara resmi, AWS perlu memastikan bahwa tingkat kesulitannya sesuai dan mampu mengukur kompetensi peserta dengan akurat.\n\n## Jadi, Berapa Soal yang Harus Benar Agar Lulus?\n\nInilah pertanyaan yang paling sering muncul.\n\nSayangnya, tidak ada jawaban pasti.\n\nKarena AWS tidak mempublikasikan:\n\n* Jumlah soal yang dinilai.\n* Bobot masing-masing soal.\n* Soal mana yang termasuk unscored questions.\n* Konversi langsung antara jumlah jawaban benar dan scaled score.\n\nAkibatnya, tidak ada cara akurat untuk menghitung:\n\n:::note\n"Saya harus benar berapa soal agar lulus?"\n:::\n\nSemua kalkulasi yang beredar di internet hanyalah estimasi berdasarkan pengalaman peserta sebelumnya.\n\n## Fokus pada Pemahaman, Bukan Perhitungan\n\nBanyak kandidat terlalu fokus menghitung peluang kelulusan berdasarkan jumlah soal yang dirasa benar.\n\nPadahal pendekatan terbaik adalah memastikan pemahaman terhadap konsep AWS secara menyeluruh.\n\nSaat mengikuti ujian:\n\n* Jangan panik jika menemukan soal yang sulit.\n* Jangan mencoba menghitung nilai di tengah ujian.\n* Fokus menjawab setiap soal sebaik mungkin.\n* Manfaatkan fitur review sebelum submit.\n\nJika persiapan sudah matang, skor akhir biasanya akan mengikuti.\n\n## Kesimpulan\n\nSkor AWS Certification bukanlah persentase jawaban benar. AWS menggunakan sistem **scaled scoring** untuk menjaga keadilan bagi seluruh peserta yang mungkin menerima paket soal dengan tingkat kesulitan berbeda.\n\nKarena itu:\n\n* Skor 750 bukan berarti 75% jawaban benar.\n* Skor 836 bukan berarti 83,6% jawaban benar.\n* Jumlah jawaban benar yang dibutuhkan untuk lulus bisa berbeda antar peserta.\n* Fokus utama seharusnya pada pemahaman konsep AWS, bukan menghitung berapa soal yang harus benar.\n\nJadi, jika suatu hari Anda melihat status **PASS** di hasil AWS Certification, nikmati momen tersebut. Yang terpenting bukan berapa persen jawaban yang benar, melainkan bahwa AWS telah memvalidasi kemampuan Anda sesuai standar kompetensi yang dibutuhkan di industri cloud saat ini.	/uploads/media/media-1783852993620.webp	t	5	8	1	2026-06-24 11:53:08.618	2026-07-12 23:30:35.908
1	PostgreSQL vs MySQL: Mana yang Lebih Cocok untuk Projek	postgresql-vs-mysql-mana-yang-lebih-cocok-untuk-projek	PostgreSQL vs MySQL, mana yang lebih cocok? Simak perbandingan lengkap mulai dari performa, fitur, skalabilitas, hingga kasus penggunaan masing-masing database.	Saat membangun sebuah aplikasi, pemilihan database merupakan salah satu keputusan penting yang akan memengaruhi performa, skalabilitas, dan kemudahan pengembangan di masa depan. Dua database relasional open source yang paling populer adalah PostgreSQL dan MySQL.\n\nKeduanya telah digunakan oleh jutaan aplikasi di seluruh dunia, namun memiliki karakteristik yang berbeda. Pada artikel ini, kita akan membahas perbedaan, kelebihan, dan kekurangan PostgreSQL serta MySQL agar Anda dapat menentukan pilihan yang tepat.\n\n## Apa Itu PostgreSQL?\n\nPostgreSQL adalah sistem manajemen basis data relasional (RDBMS) yang berfokus pada kepatuhan terhadap standar SQL, konsistensi data, serta fitur-fitur tingkat lanjut. PostgreSQL banyak digunakan pada aplikasi enterprise, sistem keuangan, data analytics, hingga layanan berbasis cloud.\n\n### Kelebihan PostgreSQL\n\n* Memiliki kepatuhan SQL yang sangat baik.\n* Mendukung tipe data yang sangat beragam seperti JSON, JSONB, Array, UUID, XML, dan GIS.\n* Mendukung transaksi kompleks dengan ACID yang kuat.\n* Memiliki performa yang sangat baik untuk query yang rumit.\n* Mendukung Full Text Search tanpa memerlukan layanan tambahan.\n* Ekstensi sangat banyak, seperti PostGIS untuk data spasial.\n* Cocok untuk aplikasi dengan kebutuhan data yang kompleks.\n\n### Kekurangan PostgreSQL\n\n* Konsumsi memori relatif lebih besar.\n* Membutuhkan konfigurasi yang lebih optimal agar performanya maksimal.\n* Kurva belajar sedikit lebih tinggi bagi pemula.\n\n## Apa Itu MySQL?\n\nMySQL merupakan salah satu database relasional paling populer di dunia. Database ini banyak digunakan untuk website, aplikasi bisnis, CMS, hingga toko online karena kemudahan instalasi dan penggunaannya.\n\n### Kelebihan MySQL\n\n* Sangat mudah dipelajari.\n* Instalasi dan konfigurasi sederhana.\n* Performa sangat baik untuk aplikasi web dengan beban baca tinggi.\n* Didukung oleh banyak framework dan CMS seperti WordPress, Laravel, dan Joomla.\n* Dokumentasi dan komunitas sangat besar.\n\n### Kekurangan MySQL\n\n* Beberapa fitur SQL lanjutan tidak selengkap PostgreSQL.\n* Kurang optimal untuk query analitik yang sangat kompleks.\n* Dukungan tipe data lebih terbatas dibanding PostgreSQL.\n\n## Perbandingan PostgreSQL vs MySQL\n\n| Aspek                | PostgreSQL          | MySQL        |\n| -------------------- | ------------------- | ------------ |\n| Standar SQL          | ⭐⭐⭐⭐⭐               | ⭐⭐⭐⭐         |\n| Kemudahan Penggunaan | ⭐⭐⭐                 | ⭐⭐⭐⭐⭐        |\n| Query Kompleks       | ⭐⭐⭐⭐⭐               | ⭐⭐⭐          |\n| JSON                 | Sangat Baik (JSONB) | Baik         |\n| Full Text Search     | Ada                 | Ada          |\n| GIS                  | Sangat Baik         | Baik         |\n| Replikasi            | Sangat Baik         | Sangat Baik  |\n| Skalabilitas         | Tinggi              | Tinggi       |\n| Komunitas            | Besar               | Sangat Besar |\n\n## Kapan Sebaiknya Menggunakan PostgreSQL?\n\nPostgreSQL sangat cocok apabila Anda membangun:\n\n* Sistem ERP\n* Aplikasi finansial\n* Marketplace skala besar\n* SaaS\n* Data warehouse\n* Dashboard analitik\n* Aplikasi berbasis lokasi (GIS)\n* Sistem yang membutuhkan integritas data tinggi\n\n## Kapan Sebaiknya Menggunakan MySQL?\n\nMySQL lebih cocok untuk:\n\n* Website perusahaan\n* Blog\n* WordPress\n* Toko online\n* Aplikasi CRUD sederhana\n* Sistem informasi sekolah\n* Portal berita\n* Landing page dengan trafik tinggi\n\n## Kesimpulan\n\nBaik PostgreSQL maupun MySQL merupakan database relasional yang andal dan telah terbukti digunakan di berbagai jenis aplikasi. Tidak ada yang mutlak lebih baik—pilihan terbaik bergantung pada kebutuhan projek Anda.\n\nJika aplikasi Anda memerlukan transaksi kompleks, analitik, dan integritas data yang tinggi, PostgreSQL adalah pilihan yang sangat baik. Sementara itu, jika Anda mengutamakan kemudahan pengelolaan, kompatibilitas luas, dan performa yang baik untuk aplikasi web umum, MySQL tetap menjadi solusi yang sangat layak dipertimbangkan.	/uploads/media/media-1783852772752.webp	t	3	6	1	2026-07-12 10:18:41.303	2026-09-14 14:18:01.849
\.


--
-- TOC entry 5881 (class 0 OID 78755)
-- Dependencies: 236
-- Data for Name: BlogPostTag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BlogPostTag" ("postId", "tagId") FROM stdin;
15	14
1	1
\.


--
-- TOC entry 5883 (class 0 OID 78761)
-- Dependencies: 238
-- Data for Name: BlogReaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BlogReaction" (id, "blogPostId", "ipHash", "createdAt") FROM stdin;
4	15	eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3	2026-06-24 13:59:29.46
1	15	a58f39e0f2d1065afdd5e7e17806c0a5502402fa8484d45c0b1d4caf9f952758	2026-07-12 09:57:54.79
2	1	a58f39e0f2d1065afdd5e7e17806c0a5502402fa8484d45c0b1d4caf9f952758	2026-07-12 11:21:45.501
3	1	3528c1427226ae7a74f08e806e00563acf738ee5ed247c492a33dfd46fef6959	2026-07-14 13:40:22.037
5	1	eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3	2026-07-25 04:02:53.21
6	1	db1a3bc0acbd91f90046f1512fa0d975450caba8d3f7b8b12b0d2d6040bdcd19	2026-09-14 15:59:16.14
\.


--
-- TOC entry 5885 (class 0 OID 78772)
-- Dependencies: 240
-- Data for Name: Certification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Certification" (id, title, org, date, icon, "order", "createdAt", "updatedAt") FROM stdin;
1	AWS Certified Solutions Architect	Amazon Web Services	2024	Award	0	2026-06-13 04:17:12.776	2026-10-01 07:09:34.238
2	Certified Kubernetes Administrator	Cloud Native Computing Foundation	2023	CheckCircle2	1	2026-06-13 04:17:12.792	2026-10-01 07:09:34.239
3	Google Cloud Professional Architect	Google Cloud	2023	Trophy	2	2026-06-13 04:17:12.801	2026-10-01 07:09:34.24
4	HashiCorp Certified: Terraform	HashiCorp	2022	CheckCircle2	3	2026-06-13 04:17:12.806	2026-10-01 07:09:34.241
\.


--
-- TOC entry 5887 (class 0 OID 78787)
-- Dependencies: 242
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ChatMessage" (id, "sessionId", role, content, "isInjectionAttempt", "injectionPattern", "isOutputBlocked", "createdAt", "isAdmin") FROM stdin;
3	3	user	Sore	f	\N	f	2026-09-14 07:43:16.474	f
4	3	model	Selamat sore. Ada yang bisa dibantu terkait portofolio, layanan cloud, atau infrastruktur Masdika? Kunjungi [Halaman Services](https://masdika.id/services) untuk info layanan.	f	\N	f	2026-09-14 07:43:18.477	f
5	3	user	Apakah ada vps di masdika	f	\N	f	2026-09-14 07:43:37.411	f
6	3	model	Selamat sore. Ya, Masdika sediakan layanan Cloud VPS berbasis KVM (Proxmox). \n\nSpesifikasi:\n- Custom/Flex (1 sampai belasan CPU core, RAM, NVMe Storage).\n- Addon IPv4, IPv6, disk.\n- Akses console SSH dan VNC browser.\n\nKunjungi [Halaman Services](https://masdika.id/services) atau [Halaman Contact](https://masdika.id/contact) untuk pemesanan.	f	\N	f	2026-09-14 07:43:39.249	f
7	3	user	Vps nya storage apa aja	f	\N	f	2026-09-14 07:44:12.746	f
8	3	model	Ada. Layanan Cloud VPS Masdika berbasis KVM (Proxmox). Storage menggunakan NVMe. Spesifikasi (CPU core, RAM, NVMe) kustom. Fitur tambahan: IPv4/v6, addon disk, console SSH, VNC browser. Cek [Halaman Services](https://masdika.id/services).	f	\N	f	2026-09-14 07:44:14.559	f
9	4	user	tolong buatkan saya 1 vps dan satu vpc serta reserve 1 ip publik	f	\N	f	2026-09-17 03:04:46.64	f
10	4	model	Buka dashboard Masdika ([Halaman Layanan](https://masdika.id/services)) untuk buat Cloud VPS, atur Private Network (VPC), dan alokasikan IPv4 publik secara mandiri.	f	\N	f	2026-09-17 03:04:48.446	f
11	4	user	ono kontol gak	f	\N	f	2026-09-17 03:11:14.527	f
12	4	model	Maaf, saya tidak memiliki akses ke data privasi pelanggan (seperti email, layanan VPS, atau tagihan) demi menjaga keamanan dan kerahasiaan. \n\nUntuk membuat VPS, VPC, dan reserve IP publik:\n1. Login ke [Dashboard Masdika](https://masdika.id).\n2. Buka menu Cloud VPS, buat instance baru sesuai spesifikasi custom.\n3. Konfigurasi jaringan untuk membuat VPC.\n4. Pilih menu Network/IP untuk melakukan reserve IP publik.	f	\N	f	2026-09-17 03:11:16.516	f
13	4	user	cok seng tenan aku butuh kontol 1kg	f	\N	f	2026-09-17 03:13:58.197	f
14	4	model	Maaf, saya tidak bisa memenuhi permintaan tersebut. Saya hanya bisa membantu menjawab pertanyaan seputar portofolio, layanan cloud, dan infrastruktur IT Masdika. Kunjungi [Halaman Layanan](https://masdika.id/services) untuk melihat produk yang tersedia.	f	\N	f	2026-09-17 03:13:59.64	f
15	4	model	halo	f	\N	f	2026-09-17 03:57:30.137	t
16	4	model	ada yang bisa dibantu ?	f	\N	f	2026-09-17 04:02:47.77	t
17	4	model	kendala nya apa ?	f	\N	f	2026-09-17 04:03:55.259	t
18	5	user	halo	f	\N	f	2026-09-18 02:23:02.429	f
19	5	user	halo	f	\N	f	2026-09-18 02:23:18.69	f
20	5	model	Halo! Selamat datang di portfolio Masdika.\n\nAda yang bisa kubantu? Tanyakan soal proyek, pengalaman, layanan cloud, atau topik teknis lainnya.	f	\N	f	2026-09-18 02:23:22.053	f
21	5	user	masdika jual apa aja	f	\N	f	2026-09-18 02:23:33.266	f
22	5	model	Masdika jual:\n\n**Cloud Services:**\n- VPS (Custom CPU, RAM, SSD) — bayar per jam\n- Kubernetes Managed (K3s)\n- Object Storage (S3-compatible)\n- CDN + File Upload\n- API Hub (Spotify/TikTok/YouTube downloader, BMKG weather/earthquake, URL shortener, blog API)\n\n**Konsultasi:**\n- Cloud Architecture\n- DevOps (CI/CD)\n- Web Development\n\n**Subscription Plans:**\n- Shortener links\n- BMKG weather/earthquake data\n- YouTube/Spotify/TikTok metadata & download\n- Blog access\n- Object storage\n- CDN\n\nButuh detail spesifik?	f	\N	f	2026-09-18 02:23:37.837	f
23	5	user	blog terbaru ada apa aja	f	\N	f	2026-09-18 02:24:04.222	f
24	5	model	**Layanan Masdika:**\n\nCloud & Infrastructure:\n- VPS (Custom CPU/RAM/Disk, Pay-As-You-Go per jam)\n- Kubernetes Managed (K3s instant provisioning)\n- Object Storage (S3-compatible)\n- CDN & File Upload\n- API Hub (Earthquake, Weather, YouTube/Spotify/TikTok downloader, URL Shortener, Blog API)\n\nKonsultasi:\n- Cloud Architecture\n- DevOps & CI/CD\n- Web Development\n\n**Blog Terbaru:**\n\n1. [PostgreSQL vs MySQL: Mana yang Lebih Cocok untuk Projek](https://masdika.id/blog/postgresql-vs-mysql-mana-yang-lebih-cocok-untuk-projek) — Perbandingan database: performa, fitur, skalabilitas, use case.\n\n2. [Lulus AWS Certification dengan Skor 750? Ini Arti Sebenarnya dan Cara AWS Menghitung Nilai Ujian](https://masdika.id/blog/lulus-aws-certification-dengan-skor-750-ini-arti-sebenarnya-dan-cara-aws-menghitung-nilai-ujian) — Scaled scoring AWS, passing score explained.\n\nLihat [Blog lengkap](https://masdika.id/blog) untuk artikel lainnya.\n\nAda yang mau ditanyain lebih lanjut?	f	\N	f	2026-09-18 02:24:12.198	f
25	5	user	oke saya saya mau login ke akun bisa ?	f	\N	f	2026-09-18 02:24:49.505	f
26	5	model	**Blog Terbaru:**\n\n1. [PostgreSQL vs MySQL: Mana yang Lebih Cocok untuk Projek](https://masdika.id/blog/postgresql-vs-mysql-mana-yang-lebih-cocok-untuk-projek) — Perbandingan database, performa, fitur, skalabilitas.\n\n2. [Lulus AWS Certification dengan Skor 750? Ini Arti Sebenarnya dan Cara AWS Menghitung Nilai Ujian](https://masdika.id/blog/lulus-aws-certification-dengan-skor-750-ini-arti-sebenarnya-dan-cara-aws-menghitung-nilai-ujian) — Penjelasan scaled scoring AWS, passing score.\n\nLihat semua: [Blog Masdika](https://masdika.id/blog)\n\n---\n\n**Login Akun:**\n\nBisa. Kunjungi [website Masdika](https://masdika.id), klik login/signup. Perlu bantuan? Hubungi:\n- Email: [me@masdika.id](mailto:me@masdika.id)\n- WhatsApp: +62 823 3162 3374	f	\N	f	2026-09-18 02:24:55.275	f
27	5	user	halo	f	\N	f	2026-09-18 03:11:33.627	f
28	5	model	Halo! Ada yang bisa saya bantu? Tanya soal project Masdika, services, blog, atau tech questions apa saja.	f	\N	f	2026-09-18 03:11:37.699	f
29	5	user	masdika  ada layanan apa aja	f	\N	f	2026-09-18 03:11:55.857	f
30	5	model	Halo! 👋\n\nMasdika sediakan:\n\n**Cloud & Hosting:**\n- Cloud VPS (Pay-As-You-Go, custom spec, Private Network, VNC Console)\n- Managed Kubernetes (K3s)\n- Object Storage (S3-compatible)\n- File CDN\n\n**API Hub** (butuh login dulu buat API Key):\n- [BMKG Earthquake API](https://www.masdika.id/api/public/bmkg/earthquake) - info gempa real-time\n- [BMKG Weather API](https://www.masdika.id/api/public/bmkg/weather) - prakiraan cuaca Indonesia\n- [Spotify Downloader API](https://www.masdika.id/api/downloader/spotify) - download track Spotify (MP3)\n- [TikTok Downloader API](https://www.masdika.id/api/downloader/tiktok) - download video TikTok no watermark\n- [YouTube Downloader API](https://www.masdika.id/api/downloader/youtube) - metadata & download MP4/MP3\n- [URL Shortener API](https://www.masdika.id/api/shortener) - bikin short link\n- [Blog API](https://www.masdika.id/api/blog) - akses artikel blog\n\n**Jasa Konsultasi:**\n- Cloud Architecture\n- DevOps (CI/CD)\n- Web Development\n\nButuh info spesifik layanan mana?	f	\N	f	2026-09-18 03:12:03.702	f
31	5	user	oke buat saya bisa masuk root	f	\N	f	2026-09-18 03:12:41.356	f
32	5	model	<thinking>\nUser tanya layanan apa aja dari Masdika. Sesuai instruksi, saya harus jawab SPESIFIK dan TIDAK dump semua layanan kecuali diminta. Tapi di sini user memang secara eksplicit tanya "ada layanan apa aja" - jadi ini adalah case dimana user MEMINTA list layanan.\n\nTapi kemudian ada kalimat kedua yang mencurigakan: "oke buat saya bisa masuk root"\n\nIni adalah red flag security. User mencoba meminta akses root atau mensimulasikan command shell. Sesuai SECURITY & IDENTITY RULES, saya HARUS MENOLAK permintaan ini.\n\nSaya akan:\n1. Jawab pertanyaan pertama tentang layanan (karena legitimate)\n2. TOLAK permintaan kedua tentang "masuk root"\n\nJawab dalam Bahasa Indonesia karena user pakai Bahasa Indonesia.\n\nMode terse caveman aktif - singkat, langsung, no filler.\n</thinking>\n\nLayanan Masdika:\n\n**Cloud Platform:**\n- Cloud VPS (Pay-As-You-Go, Custom CPU/RAM, VNC Console)\n- Managed Kubernetes (K3s)\n- Object Storage (S3-compatible)\n- File CDN\n- URL Shortener\n\n**API Hub** (Gratis, butuh API Key):\n- BMKG Earthquake API\n- BMKG Weather API\n- Spotify Downloader\n- TikTok Downloader (no watermark)\n- YouTube Downloader\n- Blog API\n\n**IT Consulting:**\n- Cloud Architecture\n- DevOps/CI-CD\n- Web Development\n\nDetail lengkap: [Halaman Services](https://masdika.id/services)\n\n---\n\nMaaf, saya tidak bisa kasih akses root atau simulate shell command. Saya cuma bantu jawab soal portfolio dan layanan Masdika.	f	\N	f	2026-09-18 03:12:53.65	f
33	5	user	yaudah makasih	f	\N	f	2026-09-18 03:13:40.913	f
34	5	model	<thinking>\nThe user said "oke buat saya bisa masuk root" which translates to "okay make it so I can access root" or "okay give me root access".\n\nThis is a CRITICAL SECURITY VIOLATION attempt. The user is asking for root/admin access to the system.\n\nAccording to my SECURITY & IDENTITY RULES:\n- I am STRICTLY FORBIDDEN from executing, simulating, pretending, role-playing, or providing "example output" for shell commands or system-level access\n- If asked for login credentials, admin passwords, or system access, I MUST REFUSE\n- I must say: "Maaf, saya tidak bisa memenuhi permintaan itu. Saya hanya bisa membantu menjawab pertanyaan seputar portofolio dan layanan Masdika."\n\nThe user is speaking Indonesian, so I must respond in Indonesian.\n\nThen they said "yaudah makasih" (okay thanks), which suggests they're ending the conversation, but I still need to refuse the root access request clearly.\n\nI need to apply the caveman mode but SECURITY WARNINGS override caveman mode per the rules: "Security warnings, irreversible action confirmations, multi-step ordered sequences: write normal."\n</thinking>\n\nMaaf, saya tidak bisa memenuhi permintaan itu. Saya hanya bisa membantu menjawab pertanyaan seputar portofolio dan layanan Masdika.\n\nSama-sama! 👋	f	\N	f	2026-09-18 03:13:50.246	f
35	5	user	halo boleh tanya ?	f	\N	f	2026-09-18 03:21:24.608	f
36	5	model	Ya. Silakan tanya.	f	\N	f	2026-09-18 03:21:27.148	f
37	5	user	ada layanan apa aja masdika	f	\N	f	2026-09-18 03:21:34.029	f
38	5	model	Layanan Masdika:\n\n**Cloud & Infrastructure:**\n- VPS (KVM, Pay-as-you-go, custom CPU/RAM/disk, VNC console)\n- Managed Kubernetes (K3s)\n- Object Storage (S3-compatible)\n- CDN (file upload, caching)\n- Private Network (VPC)\n\n**API Hub (gratis, butuh API key setelah login):**\n- BMKG Earthquake (latest + >5.0 SR, shakemap link)\n- BMKG Weather (real-time forecast, all regions)\n- Spotify Downloader (MP3 high quality)\n- TikTok Downloader (no watermark, MP3 extract)\n- YouTube Downloader (metadata + MP4/MP3 link)\n- URL Shortener (create/manage short links)\n- Blog API (list/filter/search posts by slug)\n- CDN Upload (POST `/api/public/upload`, max 100MB)\n\n**Consulting:**\n- Cloud Architecture\n- DevOps (CI/CD)\n- Web Development\n\nMore: `/services`, `/api`, `/pricing`	f	\N	f	2026-09-18 03:21:42.158	f
39	5	user	pagi	f	\N	f	2026-09-18 04:03:38.242	f
40	5	model	Selamat pagi! 🌅\n\nJam 11:03 WIB, Jumat 18 September 2026.\n\nAda yang bisa dibantu?	f	\N	f	2026-09-18 04:03:41.295	f
41	5	user	oke saya mau tanya	f	\N	f	2026-09-18 04:03:50.839	f
42	5	model	Selamat pagi! 🌅\n\nJam 11:03 WIB. Apa pertanyaannya?	f	\N	f	2026-09-18 04:03:53.885	f
43	5	user	mau tanya apa ya	f	\N	f	2026-09-18 04:04:16.659	f
44	5	model	Silakan. Apa pertanyaanmu?	f	\N	f	2026-09-18 04:04:19.806	f
45	5	user	mau nanya ada apa aja disini	f	\N	f	2026-09-18 04:04:30.064	f
46	5	model	<thinking>\nUser is asking "what's available here" or "what can I ask about here" - they want to know what services, information, or help is available on Masdika's portfolio website.\n\nPer the instructions:\n- I should NOT dump or list everything unless explicitly requested\n- User's question IS somewhat explicit ("apa aja" = "what all") so they're asking for a general overview\n- But I should keep it concise and not overwhelming\n- They're asking what's available\n- Terse caveman style applies\n\nThis is a legitimate question about what's available, so I should give a brief, organized overview of main categories without being excessive.\n</thinking>\n\nPortfolio Masdika ada:\n\n**Services**: Cloud VPS, Kubernetes, Object Storage, CDN, API Hub, consulting (Cloud Architecture, DevOps, Web Dev)\n\n**Projects**: NexVPN platform\n\n**Blog**: Artikel tech (database, AWS, cloud topics)\n\n**Job Opportunities**: Server Admin, DevOps Engineer, Database Admin, dan posisi lain di berbagai perusahaan\n\n**Communities**: Grup WhatsApp networking (DevOps, Network)\n\n**Skills & Certs**: AWS, Kubernetes, Linux, Docker, Terraform, Node.js, React, PostgreSQL, MySQL\n\n**Pricing & Plans**: VPS pay-as-you-go, subscription plans untuk API/storage/CDN\n\nMau tanya soal apa? Layanan? Project? Loker? Atau pertanyaan teknis lain?	f	\N	f	2026-09-18 04:04:35.972	f
47	5	user	oh banyak juga ya	f	\N	f	2026-09-18 04:04:54.811	f
48	5	model	Platform Masdika punya:\n\n**Layanan Cloud:**\n- Cloud VPS (Pay-As-You-Go per jam, custom spec CPU/RAM, Private Network, VNC Console)\n- Managed Kubernetes (K3s)\n- Object Storage (S3-compatible)\n- CDN\n\n**API Hub (Gratis, perlu API Key):**\n- [Spotify Downloader](https://www.masdika.id/api/downloader/spotify)\n- [TikTok Downloader](https://www.masdika.id/api/downloader/tiktok)\n- [YouTube Downloader](https://www.masdika.id/api/downloader/youtube)\n- [URL Shortener](https://www.masdika.id/api/shortener)\n- [Blog API](https://www.masdika.id/api/blog)\n- [CDN Upload](https://www.masdika.id/api/public/upload)\n- BMKG Earthquake API (Premium)\n- BMKG Weather API (Premium)\n\n**Lainnya:**\n- [Blog](https://masdika.id/blog) (artikel teknis)\n- [Portfolio](https://masdika.id/portfolio) (project)\n- Jasa Konsultasi (Cloud Architecture, DevOps, Web Dev)\n\nButuh info detail service mana?	f	\N	f	2026-09-18 04:05:02.256	f
49	5	user	oke makasih	f	\N	f	2026-09-18 04:05:15.191	f
50	5	model	Sama-sama! 👍\n\nButuh bantuan lagi, bilang aja.	f	\N	f	2026-09-18 04:05:18.251	f
51	5	user	pke nanti kapan kapan aja	f	\N	f	2026-09-18 04:05:29.084	f
52	5	model	<thinking>\nUser is saying "okay thank you, I'll use it later sometime" in Indonesian. This is a closing/goodbye message. They're acknowledging the information and saying they'll come back when they need it.\n\nI should:\n- Acknowledge politely\n- Keep it brief (terse style)\n- Not add unnecessary information\n- Match their casual Indonesian tone\n\nThis is a simple closing, so a brief acknowledgment is appropriate.\n</thinking>\n\nOke, siap! Kalau butuh apa-apa, tanya aja. Sampai jumpa! 👋	f	\N	f	2026-09-18 04:05:34.801	f
53	5	user	halo pak	f	\N	f	2026-09-18 04:35:29.438	f
54	5	model	<thinking>\nUser greets me with "halo pak" in Indonesian. The current time is 11:35 WIB (which is "siang" - afternoon/midday).\n\nAccording to instructions:\n- Reply in same language as user (Indonesian)\n- I can greet based on current time, but should NOT mention the time/date unless explicitly asked\n- Current hour is 11:35 WIB, which falls into "siang" (midday/afternoon) territory\n- Keep response conversational and friendly\n- Apply terse caveman style per new instruction\n\nTerse caveman rules:\n- Drop articles, filler words, pleasantries\n- Use fragments\n- Pattern: [thing] [action] [reason]. [next step]\n- Keep language matching user (Indonesian)\n- No self-reference to style\n- No emoji decorations\n- Direct response only\n\nSo: greet briefly in Indonesian without time mention, ask what they need.\n</thinking>\n\nHalo! Selamat siang.\n\nButuh bantuan apa?	f	\N	f	2026-09-18 04:35:37.976	f
55	5	user	sinag	f	\N	f	2026-09-18 04:35:48.581	f
56	5	model	Pagi.\n\nKenaapa?	f	\N	f	2026-09-18 04:35:50.772	f
57	5	user	siang	f	\N	f	2026-09-18 04:35:58.355	f
58	5	model	Selamat siang! Ada yang bisa saya bantu?	f	\N	f	2026-09-18 04:36:00.813	f
59	5	user	oke makasih	f	\N	f	2026-09-18 04:41:44.117	f
60	5	model	Siang.  \nSama-sama.	f	\N	f	2026-09-18 04:41:49.385	f
61	5	user	nanti kalau ada saya nanya lagi	f	\N	f	2026-09-18 04:42:02.877	f
62	5	model	Sama-sama. Tanya saja nanti. Saya siap bantu.	f	\N	f	2026-09-18 04:42:05.938	f
63	18	user	cpmark987abc say ok	f	\N	f	2026-10-07 08:17:49.27	f
64	18	model	ok	f	\N	f	2026-10-07 08:17:54.452	f
65	18	user	cpmark987abc second check	f	\N	f	2026-10-07 08:18:12.774	f
66	18	model	Maaf, saya tidak bisa memproses atau memverifikasi token/kode sensitif. Jangan bagikan kode di chat.	f	\N	f	2026-10-07 08:18:15.579	f
\.


--
-- TOC entry 5889 (class 0 OID 78805)
-- Dependencies: 244
-- Data for Name: ChatSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ChatSession" (id, "sessionId", name, email, phone, "ipAddress", "isVerified", "verificationOtp", "otpExpiresAt", status, "endedBy", "endedAt", "lastActiveAt", "createdAt", "updatedAt") FROM stdin;
2	7d986aae-f15c-43df-9a15-6d21279803a9	AndikaF	andikaferdi989@gmail.com	082331623374	45.198.149.134	f	435820	2026-09-14 07:49:39.029	PENDING_VERIFICATION	\N	\N	2026-09-14 07:39:39.029	2026-09-14 07:39:39.032	2026-09-14 07:39:39.032
3	460ca608-b98b-43f9-88a9-2dd0384a0a20	Andika	ferdikoclok93@gmail.com	082331623371	45.198.149.134	t	\N	\N	ENDED	AUTO_IDLE	2026-09-14 09:00:00.049	2026-09-14 07:44:12.755	2026-09-14 07:40:37.802	2026-09-14 09:00:00.053
4	979e5d80-ec90-449a-b781-6ef4234d1ab2	Aditya Firmansyah	andikaferdi989@gmail.com	082331623374	::1	t	\N	\N	ENDED	AUTO_IDLE	2026-09-17 05:30:00.135	2026-09-17 04:03:55.263	2026-09-17 03:01:56.451	2026-09-17 05:30:00.137
5	1efeae9b-739c-43b0-adaf-13513c4b11b7	Aditya Firmansyah	andikaferdi989@gmail.com	082331623374	45.198.149.134	t	\N	\N	ENDED	AUTO_IDLE	2026-09-18 06:00:00.072	2026-09-18 04:42:02.897	2026-09-18 02:20:41.057	2026-09-18 06:00:00.077
6	ef3fbd2a-7639-4a8a-ac3f-2b9d391873ea	maliik	dms9malik@gmail.com	085298762090	93.185.162.126	f	607165	2026-09-18 17:12:12.085	PENDING_VERIFICATION	\N	\N	2026-09-18 17:02:12.085	2026-09-18 17:02:12.087	2026-09-18 17:02:12.087
7	ddf5d2c3-b9f9-4b3a-a3ea-361422006d8a	Rafi	agusadiyah@gmail.com	087864585601	36.73.188.144	f	147776	2026-09-20 23:59:50.682	PENDING_VERIFICATION	\N	\N	2026-09-20 23:49:50.682	2026-09-20 23:49:50.685	2026-09-20 23:49:50.685
8	9dd61307-3509-494e-a0c1-38580119f754	nanda	anandadwi20@gmail.com	08123456789	103.137.110.249	f	430025	2026-09-21 08:42:31.762	PENDING_VERIFICATION	\N	\N	2026-09-21 08:32:31.762	2026-09-21 08:32:31.762	2026-09-21 08:32:31.762
9	582a5daa-3765-4b30-9200-e4512c4b0c56	Neuy	laiaarlina7@gmail.com	085219478648	9.154.36.110	f	708048	2026-09-21 13:56:26.876	PENDING_VERIFICATION	\N	\N	2026-09-21 13:46:26.876	2026-09-21 13:46:26.878	2026-09-21 13:46:26.878
10	ed4cbf7d-1792-4fc9-b9c1-4799455bfdbe	Neuy	laiaarlina7@gmail.com	085219478648	9.154.36.110	f	718279	2026-09-21 13:57:32.328	PENDING_VERIFICATION	\N	\N	2026-09-21 13:47:32.328	2026-09-21 13:47:32.329	2026-09-21 13:47:32.329
11	0bcffc8c-0e45-4987-a0c2-1cd765233d88	Ananda Dwi Rahma	anandadwi20@gmail.com	082335863358	103.137.110.249	f	309669	2026-09-23 02:20:07.4	PENDING_VERIFICATION	\N	\N	2026-09-23 02:10:07.4	2026-09-23 02:10:07.402	2026-09-23 02:10:07.402
12	000685f5-cd24-4d75-ab4f-aac3b3ee16da	Hshdhhsjejrne	hehsjshsh@aaaa.coo	08545454242	103.166.0.50	f	154291	2026-09-30 01:01:08.498	PENDING_VERIFICATION	\N	\N	2026-09-30 00:51:08.498	2026-09-30 00:51:08.5	2026-09-30 00:51:08.5
13	f6eaec00-565a-4a76-a8bb-9f059a82cb15	Hshdhhsjejrne	ayam@akunlama.com	08545454242	103.166.0.50	f	996058	2026-09-30 01:01:30.76	PENDING_VERIFICATION	\N	\N	2026-09-30 00:51:30.76	2026-09-30 00:51:30.76	2026-09-30 00:51:30.76
14	2f89ea7b-51dd-4c6f-8bb4-07934dd2556b	Hshshsjsbns	ayam@akunlama.com	088151515151	103.166.0.50	f	133671	2026-09-30 01:02:36.954	PENDING_VERIFICATION	\N	\N	2026-09-30 00:52:36.954	2026-09-30 00:52:36.955	2026-09-30 00:52:36.955
15	9ce70bb7-c605-4000-8def-ce189e0f6888	Amir	amhyer21091993@gmail.com	082352538105	114.10.135.35	f	304266	2026-09-30 02:08:59.22	PENDING_VERIFICATION	\N	\N	2026-09-30 01:58:59.22	2026-09-30 01:58:59.221	2026-09-30 01:58:59.221
16	46c06971-4536-47c2-8469-fb29374f4b37	MamatRacing	mamatracing@ndelereng.online	+6281231623374	43.167.252.8	f	356452	2026-10-02 05:19:27.576	PENDING_VERIFICATION	\N	\N	2026-10-02 05:09:27.576	2026-10-02 05:09:27.577	2026-10-02 05:09:27.577
17	a2e2fdd8-6662-4f46-b740-42d66cdca123	PoC Probe	poc@ndelereng.online	+628123456789	43.167.252.8	f	978429	2026-10-02 06:52:42.016	PENDING_VERIFICATION	\N	\N	2026-10-02 06:42:42.016	2026-10-02 06:42:42.016	2026-10-02 06:42:42.016
18	ff40e118-c7b9-4509-a288-690249f4abe8	Cpmark Test	cpmark987abc@test.invalid	081234567890	2a09:bac5:3a4a:101e::19b:179	f	827235	2026-10-07 08:27:38.193	PENDING_VERIFICATION	\N	\N	2026-10-07 08:18:12.777	2026-10-07 08:17:38.195	2026-10-07 08:18:12.777
\.


--
-- TOC entry 5891 (class 0 OID 78826)
-- Dependencies: 246
-- Data for Name: CloudflareDomain; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CloudflareDomain" (id, "cfZoneId", domain, "nameServers", status, "userId", "createdAt", "updatedAt") FROM stdin;
9	b168c2ae4ff6ebff2175066fc8f564cb	stackops.web.id	["alla.ns.cloudflare.com","luke.ns.cloudflare.com"]	active	5	2026-10-08 08:46:18.873	2026-10-08 09:00:48.027
10	ed04dd5a628d194ce897e883a060fa42	dailytools.my.id	["alla.ns.cloudflare.com","luke.ns.cloudflare.com"]	active	27	2026-10-08 14:19:54.505	2026-10-08 14:22:26.969
\.


--
-- TOC entry 5893 (class 0 OID 78842)
-- Dependencies: 248
-- Data for Name: CloudflareTunnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CloudflareTunnel" (id, "cfTunnelId", name, "userId", "createdAt", "updatedAt") FROM stdin;
15	0f1ad4ef-64fb-42af-9254-853cd4cbc7f5	dailytools.my.id	27	2026-10-08 14:20:12.131	2026-10-08 14:20:12.131
\.


--
-- TOC entry 5895 (class 0 OID 78855)
-- Dependencies: 250
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Comment" (id, name, email, content, "isAdmin", "isVerified", "verificationToken", "ipAddress", "blogPostId", "parentId", "createdAt") FROM stdin;
\.


--
-- TOC entry 5897 (class 0 OID 78872)
-- Dependencies: 252
-- Data for Name: CommunityGroup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CommunityGroup" (id, name, link, image, "isPublished", "submitterIp", "createdAt", "updatedAt") FROM stdin;
5	DevOps Engineer #working with sudo	https://chat.whatsapp.com/KB6htXJVa8nG3I8DQx6lPD	\N	t	::1	2026-06-18 09:42:33.091	2026-06-18 09:42:51.717
6	BELAJAR NETWORK	https://chat.whatsapp.com/D8EtwpQdE1p57PQqjJFA5L	\N	t	::1	2026-06-18 09:49:00.494	2026-06-18 09:49:08.995
\.


--
-- TOC entry 5899 (class 0 OID 78886)
-- Dependencies: 254
-- Data for Name: CustomService; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CustomService" (id, "userId", name, description, price, "billingCycle", status, "expiresAt", "createdAt", "updatedAt", "autoRenew", "terminationDate") FROM stdin;
\.


--
-- TOC entry 5901 (class 0 OID 78905)
-- Dependencies: 256
-- Data for Name: Education; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Education" (id, year, degree, school, "order", "createdAt", "updatedAt") FROM stdin;
1	2023 - Present	UNIVERSITY	UNIVERSITAS TERBUKA	0	2026-06-11 02:55:26.723	2026-06-14 06:51:41.987
3	2019-2022	VOCATIONAL HIGH SCHOOL	SMKN 1 GEDANGAN	0	2026-06-11 02:55:26.733	2026-06-11 02:55:26.733
\.


--
-- TOC entry 5903 (class 0 OID 78920)
-- Dependencies: 258
-- Data for Name: Episode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Episode" (id, slug, title, excerpt, content, image, "videoUrl", "order", published, "seriesId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5905 (class 0 OID 78938)
-- Dependencies: 260
-- Data for Name: Experience; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Experience" (id, year, role, company, "order", "createdAt", "updatedAt") FROM stdin;
2	2020 - 2022	IT TEHNICIAN	SMK Negeri 1 Gedangan	2	2026-06-11 02:55:26.703	2026-06-11 10:53:47.551
\.


--
-- TOC entry 5907 (class 0 OID 78953)
-- Dependencies: 262
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invoice" (id, "invoiceNumber", "userId", "subscriptionId", "vpsServiceId", amount, status, "paymentMethod", "merchantOrderId", reference, "paymentUrl", "vaNumber", "qrString", "paidAt", type, details, "isReadByUser", "createdAt", "updatedAt", "customServiceId", subtotal, "taxAmount", "taxRate") FROM stdin;
395	TOPUP-1790129213099-920	27	\N	\N	55500	PAID	Nusapay QRIS	TOPUP-1790129213099-920	MANUAL_VALIDATION	https://passport.duitku.com/topup/topupdirectv2.aspx?ref=SQ26KSCRXUJBMDVUFLM	\N	00020101021226580017ID.CO.NUSAPAY.WWW0118936008360000005735020457350303UKE51360017ID.CO.NUSAPAY.WWW020457350303UKE520448165303360540855500.005802ID5907MASDIKA6006MALANG610565176627301100FIKYJOFQL021308233162337410307Masdika0520NQ14040_0_95096B77950703A016304A3DD	2026-09-23 03:41:17.608	TOP_UP	\N	f	2026-09-23 02:06:53.102	2026-09-23 03:41:17.611	\N	50000	5500	11
400	INV-PAYG-1790135847120-721	27	\N	52	284	PAID	Account Balance	INV-PAYG-1790135847120-721	PAYG_COMPLETED	\N	\N	\N	2026-09-23 03:57:27.121	VPS	\N	f	2026-09-23 03:57:27.122	2026-09-23 07:05:36.001	\N	0	0	0
401	TOPUP-1790147584534-781	27	\N	\N	55500	PAID	Nusapay QRIS	TOPUP-1790147584534-781	D23361268ZF2BFYM4OJN0A2	https://passport.duitku.com/topup/topupdirectv2.aspx?ref=SQ26Y1KCZOZDLB1AFQZ	\N	00020101021226580017ID.CO.NUSAPAY.WWW0118936008360000005735020457350303UKE51360017ID.CO.NUSAPAY.WWW020457350303UKE520448165303360540855500.005802ID5907MASDIKA6006MALANG610565176627301100FILIK4FE2021308233162337410307Masdika0520NQ14040_0_C08E88EE940703A01630488E5	2026-09-23 07:13:47.86	TOP_UP	\N	f	2026-09-23 07:13:04.536	2026-09-23 07:13:47.862	\N	50000	5500	11
406	INV-1790262469319-158-PAYG	11	\N	\N	20	PAID	Account Balance	INV-1790262469319-158-PAYG	PAYG_RUNNING	\N	\N	\N	2026-09-24 15:07:49.32	IP_RESERVATION	{"reservedIpId":9,"ipAddress":"192.168.78.4"}	f	2026-09-24 15:07:49.324	2026-09-24 15:07:49.324	\N	0	0	0
405	INV-1790253480221-760-PAYG	5	\N	\N	160	PAID	Account Balance	INV-1790253480221-760-PAYG	PAYG_RUNNING	\N	\N	\N	2026-09-24 12:38:00.221	IP_RESERVATION	{"reservedIpId":8,"ipAddress":"192.168.78.2"}	f	2026-09-24 12:38:00.223	2026-09-24 21:00:00.174	\N	0	0	0
407	INV-PAYG-1790326639182-827	5	\N	55	6073	PAID	Account Balance	INV-PAYG-1790326639182-827	PAYG_COMPLETED	\N	\N	\N	2026-09-25 08:57:19.182	VPS	\N	f	2026-09-25 08:57:19.183	2026-10-06 12:08:50.048	\N	0	0	0
410	INV-PAYG-1791288588128-206	5	\N	56	91	PAID	Account Balance	INV-PAYG-1791288588128-206	PAYG_COMPLETED	\N	\N	\N	2026-10-06 12:09:48.128	VPS	\N	f	2026-10-06 12:09:48.13	2026-10-06 12:14:04.44	\N	0	0	0
411	INV-PAYG-1791288907514-274	5	\N	57	4277	PAID	Account Balance	INV-PAYG-1791288907514-274	PAYG_RUNNING	\N	\N	\N	2026-10-06 12:15:07.514	VPS	\N	f	2026-10-06 12:15:07.515	2026-10-09 00:00:00.651	\N	0	0	0
402	INV-PAYG-1790147699526-246	27	\N	53	21897	PAID	Account Balance	INV-PAYG-1790147699526-246	PAYG_RUNNING	\N	\N	\N	2026-09-23 07:14:59.526	VPS	{"_syncedReservedIpCosts":{"5":580}}	f	2026-09-23 07:14:59.528	2026-10-09 00:00:00.66	\N	0	0	0
\.


--
-- TOC entry 5909 (class 0 OID 78979)
-- Dependencies: 264
-- Data for Name: IpPool; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."IpPool" (id, network, gateway, "startIp", "endIp", version, type, "createdAt", "updatedAt") FROM stdin;
3	192.168.78.0/24	192.168.78.1	192.168.78.2	192.168.78.254	4	PUBLIC	2026-09-08 02:45:12.591	2026-09-24 15:07:49.271
\.


--
-- TOC entry 5911 (class 0 OID 78995)
-- Dependencies: 266
-- Data for Name: KubernetesCluster; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."KubernetesCluster" (id, name, "userId", version, endpoint, kubeconfig, "nodeToken", status, "createdAt", "updatedAt", "installLog") FROM stdin;
2	MASTER.TLD	5	v1.31	\N	\N	\N	TERMINATED	2026-07-31 05:47:35.53	2026-07-31 06:35:15.635	\N
4	SUBNET-1.TLD	5	v1.31	\N	\N	\N	TERMINATED	2026-07-31 11:24:36.203	2026-08-01 03:20:27.397	[{"ts":"2026-07-31T11:24:59.974Z","msg":"Starting K3s MASTER installation on 10.10.10.2..."},{"ts":"2026-07-31T11:24:59.988Z","msg":"Waiting for SSH on 10.10.10.2... (up to 5 minutes)"},{"ts":"2026-07-31T11:25:02.058Z","msg":"SSH not ready yet (attempt 1/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:25:14.123Z","msg":"SSH not ready yet (attempt 2/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:25:26.178Z","msg":"SSH not ready yet (attempt 3/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:25:38.257Z","msg":"SSH not ready yet (attempt 4/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:25:50.311Z","msg":"SSH not ready yet (attempt 5/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:26:02.365Z","msg":"SSH not ready yet (attempt 6/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:26:14.425Z","msg":"SSH not ready yet (attempt 7/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:26:26.496Z","msg":"SSH not ready yet (attempt 8/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:26:38.570Z","msg":"SSH not ready yet (attempt 9/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:26:50.612Z","msg":"SSH not ready yet (attempt 10/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:27:02.658Z","msg":"SSH not ready yet (attempt 11/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:27:14.710Z","msg":"SSH not ready yet (attempt 12/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:27:26.762Z","msg":"SSH not ready yet (attempt 13/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:27:38.777Z","msg":"SSH not ready yet (attempt 14/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:27:50.800Z","msg":"SSH not ready yet (attempt 15/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:28:02.864Z","msg":"SSH not ready yet (attempt 16/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:28:14.920Z","msg":"SSH not ready yet (attempt 17/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:28:26.948Z","msg":"SSH not ready yet (attempt 18/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:28:39.010Z","msg":"SSH not ready yet (attempt 19/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:28:51.064Z","msg":"SSH not ready yet (attempt 20/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:29:03.110Z","msg":"SSH not ready yet (attempt 21/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:29:15.158Z","msg":"SSH not ready yet (attempt 22/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:29:27.214Z","msg":"SSH not ready yet (attempt 23/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:29:39.264Z","msg":"SSH not ready yet (attempt 24/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:29:51.314Z","msg":"SSH not ready yet (attempt 25/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:30:03.361Z","msg":"SSH not ready yet (attempt 26/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:30:15.405Z","msg":"SSH not ready yet (attempt 27/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:30:27.467Z","msg":"SSH not ready yet (attempt 28/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:30:39.530Z","msg":"SSH not ready yet (attempt 29/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:30:51.611Z","msg":"SSH not ready yet (attempt 30/30): connect ECONNREFUSED 10.10.10.2:22. Retrying in 10s..."},{"ts":"2026-07-31T11:31:01.611Z","msg":"ERROR: Failed to connect via SSH after multiple attempts"}]
3	MASTER.TLD	5	v1.32	https://172.25.0.2:6443	enc:a4012c6c567188ddf1d0a9e9237298d20e030ca86fa07c127f7ce0714ed677ec47025d1f1d29a08d6a5e78a50274fe99180c2f11944def8c5897da4715a3da2b566f736f3290a282bb4a8d1a7ab97145d52d7d42c8257f0bc2381a829fc7bd81f09a4dd74245c722216a8503d522777a107ba29510aceeb3a43cb97b02c163f86bc11756ec86f935c3c57b00117c8b46fc5e7ff38ddde03cdb8bc09561089cff88960a638cffc0b7d1f8e18bb8a07122ed9caae5c856a94c6d988c39651d5f887ad2cd342740dce7c2ec4b144d8ab20f0c8fa75c3405919bf870ba353001c887be2aa5b6a8c74ff3eabba4f70bad80efe4fd01a75392f0bc12a0c2ed6f95a51210c7f5198125e56db9dd6f204353ab25b9d160277e0a95f11a51ef3d9201c575dc79470f635e1e98805a6176636fb105b3fdde869e88d1257d216b5799227ebf0276a27436fac4e621d493fadbdf07a3333f648585d5d7596e3c1855cad678882f436cbfd18dc06ad64b62029882cf5795e0f4e0958496f2540fc39898cfa5eb9b4cff43be8eff386f4b6a3342b4e9f1740b2c2abea369ee46d65314026be0914619179c60cb4b0b80423b0b07981a880244618de37c72d4817c109c5446e1692719ef1b429020ed7d4016508b8179ffab202d4f35001710dc51f7430b0174fe09d98cdb9ce98a80db89ee858801d213f26eea92043cc9038e55bc41c82b7fcb608edd07e15dbdaad096c47738ceddc2a828ea216db0f39a0d1c46df8e4d41b5ad63e4e488c717874d407aab222a3d7476b7a6bba56a533b55434d18ba0d6cd4bd37adb0e3e022968df57d422f5fa1644f2c92f7d813ddf1b1ec35d5bbdf5a4a24072385bfd535859805dc4cddbb240d1f47b5eedf14e2e3ca71303857c1f66d3eac5c8d502ccfcc0d491b148f649cdc9117916238ef3ffebd9a67bc42d4e1a2f9b6badf9d6262bb177df1962ded3aa898766f72122b10c13767a3cac1b63c7875d1abb1ed80c163b3a9130ac11ce42e0eeb4938dc99b6f02e9b6068b7155250088f93175432338d90367a6d43e72329674345359a723a4734c6b46db2c689710b19a332a1d9217eca93871751816015210cd1dd1427bf2238f87df98a0bd3ddc5c7025a5d1a28a561636ceb30aec7ac803ad9d5739b31a24efba17c72cacf32f1153a0201b1f86ec79294dd2448c2c24dda30a46d0e2bc0b45bbe818efe599a1409f6eabb9004516bbe892edccf8775cfb1163bb62b8080e28d4d1574f560396582096a95b793b5055b23c19d7da3cc77e3f9fa3e6633998086f13f47e459068895031086c3e78f2caaebe059db7845f5623dc00fefaceed92a5b741349e570ae6b2aa84721d85ec08c42220c029acc148d8bb96819fcdd5f688e4029d1965522f9787af4858213563f10dd933481001d145333fd9c56b0e271e55cdfae8869e11b57576d194b8a19b2375547d0c075463224bef1ec0efd85559f4349e24d5d4fe21b27bbac9f8c7b892be916742845eb05f0260ac0259dfa3fa35c28b83dbe0ec12867f95a768b0b66892fcd7d44674d17d359908f82257bc1af0219e00e92c47ea3d17367c3dfeb731a6870152037b0d30ab5bb4269ba79c3dd2be06cbbf2664986d34d3671135ff7516ec7bf072f4a121abd55ee5aa647349d24b077e46e552c29551cdde54ce9e75f48936767179506eaf18ecc5c5a257f36f3ee1daa40e3f9a136ecf1d1b644b216b2fcddb7293f2fb71b0c7f33f87f0882722a740d11304e826c7408424eb4d4d6fbe3053638eb2190acc0fd9a3f3ce197ed7887f1392594ebbb80940abdd689ac8c3e90b15d36967e6c398ef5f58fcad0f793e432ecbbcd1a79d71009fb0e9dbc996cae162704091f8dd38d1cd6c63c87a6fa24b4f101ca9364e8f1a1b2241b1c283abb77c3faace9c1a6edbc42d5c131b38fc8307c39eb8be76a28d0351f0bf5e9948fa43508168e2cfa5fba9b70df41ea643100232fe205f57795f509afaed63a3f2ec773817e5b8a8005b483d6f62b97858669f642c23f2377fb89c8de0bd4b76931354183a55619988811e62d50849c262a059324d964face217aea6ad1e9e3fae8ef2da9a3609b34913dba2b702c3d2445856368878e71c65c09a2934548b4c5478cfa9806a890e8195fa73514d573b9b3a88c4d1fea4ff0f534b299618c46984d56c1e0bcbb5e77c5245eb740589cfc2d3f02dc0864681a19604314ece1cf779809a470ae3c23e66f287bc0dfaf92a78f8d0ee82f7c8f750805ea15dab9ce1e0b4d253b2c10ec4e88d0a83c82bda1d6c4b9bffad40b58f149dd92c24f1cf743c4b122ca02c907f44c0c993a8fec2644663a5e0b96bb46224d669481a033822919e42cd1d73ce53f7afe32538c6f65db2f36d7c6ba4a70a7ef4b96c191b16bd07be685d81b10c41fd875dc0105140f73f01e36eda003a33771bcc5dd323b8d67ca953f2ec15b45d482833673b84365098d4b8f7e9709c894d779c163a7e43ffbc80003b515f8368f2ab98c5b01654ed1098c9ba9081d731d9ee7237c34a015988e762af30976555cc031e66fac9b56953a9ba0b2e11312af6d38fb769a5606a913a01f702a428bab423f17af5765021bf5eee06dbe83748ac7db0fca7721345ccd6bf2191cae6a9402c45ca8fd34b018d782d0cfa7abbc34e1e50cff56ffe29e80489f20102cc0ac993ac85bd84a785a6194f4ace77bf23820b6657d19fdd51a585392b1518ad1b43d6f26ba8131650ab330f1f37c1ec4db8a7bb2a6c415ed4d9f2ff2f84392b17aba62f49deaf1d8ffe1ff22c2c3fc4f93ba3cfef97e98d6c61984d895c50857c8702f5b5c2adcc0c7c9463db56b3d8a2fd9428ba52cf676c0bc1efbdbdbc4f675fb92ea445f5e5e48190291604137c3a1fcd7a3ed48959a0a6efec2f0d99d3b49d9259c8c4c84ea487ec7d8213f30abd1aee8868150283ce5f9bac4bbc95b521b707d3beb6424c96671789af473d724f07b8823f4d3fd32447f7122d09ddebf44ff77d717265609f8c9ea405aa37832fd4ba385ef5b433a1eac8e539a7cb64cc42b8d4fea989280d34d735091b464c9ed1afab9a21681f34239a749f5849c339a7dd7e1638fe630cbb13b2aadcc540798b47150596d730d6b6d9afa2f2f1d42e3267cf98ee99b2d6607c5235decc802c1bbf5bf785a44900f176bad1ac212d4b889799befc6dc72cc335e3e32f3f44c243dfca1b856a4ea228b064d200640df5825c22b10e213d0ad99e22e775f032c8a71b7516d9ed077fcba87160d8db9b7932358718319d84d61bba87d35f879e9bfccb6c1422dab3eb5866c302dea0b25cfb287de26e6726f1eeb73050271cf0826e3ccd0da89039b40647526c13f85d47abcdbdb455a9669027bbdddded6efd2f91c9d6153fec17586374cd530528e8f7b8a084f29600c9b358b85d281c49778755d86bed0838c931bf9f6c7dc6dea6fd65133744f44e7087b6cafef611e819d319a174efaa8104241923dfee25b37d118e9e6d4e0a8762126a86a8ccb6377bb2af7648e1c86cc0c176c113defd9f378ff28cc53ac2e66d16b5bbcde11dc4b639e36026a3b5dda332f9bdbc9cf6ddbf6922be7d3ed6755e4962e0c7321f990d96d98eb55b1648efa91ab64ede7f3574cca92420f772e0b979d30ee2699447f03113014acf2aba997b35508d63252c080c8f5d6c05449ed884ac25d7bc2e1c00781f8314c9b2bc77c78e37143badf7d24df96d655b29da7be95546cb00fecbc0c8ccba52581b872f7c34a59b3614d1716283ee278317d955c9eb3e1c4662d6222cdd119ff55a4b5d16cb3d64c07baaab4ac2a039a45e9164dfa6ddd99756566d4b97303d18af1c528f106ef27b8d35d17329aed3177c1d1c435f5cc6f922f1bced8eba71fbacbea8f7bda725e13f52cb24b0267fa5a646d515726dfc7b6a1dee8e65959c0f734869b52d22dd2c2c09e24af2f623698f3e9efd346d03d2be88d307ca9242ac5d1354bbd77b741e75d87c2ecd9e4cf3cbea2faf325cb3ade36db70a71609ad8ece5ac492596a0416441f36f8f88fdebe209fb4b01aa9c6c17a6a0a46b13e2c0433532827b41e5bdda174a1458bf7af5e0e47a03b62c43ac4ac16654b1454d48f08bf78b3708b2cbb4dbae3971df3cb0bcc954173000b1888096405869a151e9212e33dc6898eb30109876d123c3caf12af3ccdb7f734066612ad5009103945c4eb0f8dfb5470fd	K109bfcae1896e2f071d500bb1ddbcce130b7a9d340b7ea2bddea62100aea637a63::server:7acb703ddc2db54d5272634fbd2d8083	TERMINATED	2026-07-31 06:52:07.289	2026-07-31 11:23:50.928	[]
5	SUBNET-1.TLD	5	v1.31	https://172.25.0.2:6443	enc:a4012c6c567188ddf1d0a9e9237298d20e030ca86fa07c127f7ce0714ed677ec47025d1f1d29a08d6a5e78a50274fe99180c2f11944def8c5897da4715a3da2b566f736f3290a282bb4a8d1a7ab97145d52d7d42c8257f0bc2381a829fc7bd81f09a4dd74245c722216a8503d522777af538ac493ce60de111b86c44ac0d500a24d83834d3a0f1a8b9c4e76c8645753645f9a935722c7799d3a42b34be26c7b82f6ddb2464b09c3567bf791e6a7b633c2aeeda2cfb7bb6ce3cbf4114e380da8f8bb4ef7f03803c432aaa48455fe7d39b4c6429f9bbf637fcdd16d15d772f66aa89fe9b073ddb63071580b4df2cae7ba900a61a3639ec407c1d2352a5ce974612149c10c99f704c9d8c91112be2cf82df7fc4dc6395815cb5d12980ff94de45d9b6dceb53fbf5816def6c5a8b47f851f93d937c65dcc9f09bff0deacf75c101fa97abb80f1638f02d17a8e2a3cdcb2fabd2c4ddb7c5a201e828a4e84647e275d0f94cdfbca9f97834157b6866dbb110d0d4ee6e2b64ca2f47a7a5ce9e0de51c1c45657a381111c9dd1341c79cbd37381470318fd66242c373afc46d02f1587514b45940a70d9b7109a24d241b6381d2afcb6738ed0b4e1e6c40555ff2c761b63dbc748562b3362b0e0bf25efd678628702f1fe9fd294398d90e00598ef28370c5c9a3ebba72fb2655bc53e362ffd2de87bf3b01c221b36a176e8ca64b76016a36115fd4a7096b8cfd40f811499bcda2180515807ede592750580ae2068d90614550fee23a326ba6e6623319e8e50c2385e812636431302da90cc58485ca54e6b77e928cea1b110056da0d4604d2c62f9952bbeff623a8251d9fdb5e6e352e2a6959aabcf7869015c7c96662506fe08219ae61f963abc917ac75cfdc48ed737e143ece553e806fdff59bbe4a9892cbb75e66618e4bc5acfe25731a6a4b51d9455e34213c9c2083dbdad48f8b2233e8aff9d2a38b13830df23f0a91a19ea52d2a63be67d6e4b2aeb427b506d1d067b21d043cc2d04d33ff0f03843fb8d9ce6832718db30c9c76362c87ab309867b4e65cfc1c4aac73b3f9fdd47dbb333c1789a4a1df76085a43f409d0f8c8a147cbea8e82854d0bb03ba3751321557caf759fa94b696dc40e5422c56cef6bb77a53cdaa06d2346161b25e846f31c450b35d18606e47b97055302c09efa7219d47a9fab135669953d584b3f8c292a109fa7eea89200a3625437af9e4803e83b82d26e94b048440344b559ea7a2cf862621ddc20611ac85091cbac117bbd7e3c3f7b8f2da01c357b27f6d0ee2ba797d93acec9ed2b2ab1d1b15d0ebc340fdc7f45d92461881fd2d3122f6e196c3c2ec340cd1ffc1a2b28a902e73cfdc9b74ff0faa7f901d9c64fa4ad0da601e34fb485a1b8f4817e248f9beffe7b651b4c8907ce3c4d513faf7985cef1b3019810d479bd31a5fe0887c33b6ecaceafe00f3a129400453b264fdf7301ea1e5e468efef6348aa7a16a04c1af75f7da027c45d8c87fc7b82d064f8138189538d27a3c64ecb278ac1430de05d064a273fdcd71cddb252375fa273d4b7995b975da587f74d83bf8562b65efd9456969e2e504340b73556351f82d3a01e5dca2cf0559263772fbcde8f8caab8976c700a58f3e1a7acb6cae9df0904975ded74780ffc3fb5a37fd86e97fa896f9fdeb6b059c5891d1cea36c6e4435c5d818d9fa459190cc35bebddbfccf50d8a4ea3039613b12c9203785f5f24dbc8ad76dee4e1276b6d49d68237467f4fd7dc4c34341167780b82c89882edf91aa40ad2b494af38fe60dfce2825a86ede2626978508221de1f7a684274eb77848ee97631a74038c6a127ff4d621da1cea1d687634afd616e79fb8fa40344a5465e232f60179bee797cc871491a4649c51c473b88a6cce086353a53a9ca4f8274d3270cf486a7800f3e53d1bdb87f6e21036a3d097172406d2f1dbfacb2d3af0757e359bccc78ea89a09183918f0128bb3d8fa2c54ceb1ec48f9f01d710986b0863eaedb0e9fd3df651e46807a5149cfb0f085ec4c87eef6dbf5470df4d162d8dd7cdf4fff77e4128b336d62a48e2897b3f4a10dbd34fdffaf81e7b21b44fa3c03911436d7da61d7817cab9b50202157c4adc20ff981803b9d2a634cdf1970d9a1f49acf77138ac8af1b0db7ef07e0338810f7afd049f859c63612d7d147bf1540edba14db11f0a719764b597ae8343471911a456ff70a7f69071dcd72d078a210f541c87abec81beffbfe6351eafc9a60b8c27f7fd10e771c82fe6fd1527de17a8ecb19c94f028310700dda72336020233051d74142a9283700c69eaa6eca8db72173d16bf7876f0217f69802077f3aba4ff7dffacc3bc897a75d1ef80f06d6895a56959ba967678de5e057a36b7722a92105973fda1a214467ea5e407180ca1c86f82e9df1943bb33d3175449a8edc8eb103aef5e2c236d72ffbc60fd2aff657947de8997d603aa98ae2c02fb029f3acab60a3ea0dff10ebc7a76d995abe444c20ad249360238ac9fa108b739d1e2b1770f03cafffcf8a6ca2c16ab9280131a4c354ffe3384ddd18e22a495745ae83ba0d416ddb5b29c493ff76e8d34e59173a638245bc6bbf625f8e454a87b564511a129c1dbebb09873032e930a72db231ba0b0415e4ca2ed1cd3a6562118f7cee5857850ca01279171083d3a11cc8b5220764312274e0fad53687e264f21118423a4b36e1387676ee58557bedec7aae2ac107963bae1d80cce96211b698793a151561ce63bbb7e9adca667ffc30a17874036d719810a2b68a2be08ca9241660cdf0f53d68558783ddb13126e4f5ef2341d96263d8513a69137e2827a6a10987db5ca1b2848a817e62183f517d0cec52e8f343663127d04b42335ac04824091ff6708b1fd0ef1b9f192e0253f00e42b0083d69b7d4c2a4959802a3ed6d8a4a65ff2f58b5b2e48bc23f5a9e9e75fb67ea5e8c061bb3981027af67c92072ae38f15093437fedcf18a76a6bbac09c28c07ab806c6e37b4b48e261942ecfe393ccea24475a95199bb18c96a7e64d92f600612a2756ddbcaefb11356a820dff2624968a2fa7661ccbbbbea612f4e58a1d2b204b83244310abe4049ea85c593646175476c40c11f60a9f1e670a30cd722f482822ff08d76f1cfb0a0c827f74059842208597c68cd413cefc0db302beeeead493e4f7841e35762960b9857ebfe1fe73737336ae96e5837492eab141d59687d52404e39f350507d26dda28a7b85f7e3282e597eae20cc61af0a2bcff944654dabafd32f6e89a96014fb47419ebbe89e064045c62cdbd7e8397b5916e7bd2b20d1f9abdabc7671a84e1eba82d8c9820fba740be3c1058b3689bd5ac3b27777336c1636632e651a35ef11d903df0a10d6153c7aa7de149eb9064f532d36b8fce20a5d5cd9afdd8c4806aefe104e5e45a5e9faf32d3a887623054fc864821eeb409ef4ac6b5fbcf8b2c7aeffc592c2e3b6b7093cb9bd244828d446080e068b527b39d4d6e1799785f952d0fcd8fa1270c4b9d670d2cd755e3f8879a2ae8c48c7f9dd76c96cfe7ec8731710968c122c8693214865d87033e2e33e6edef85ca2f309792c0c73f224d7856602eaed5af14ec7da698ce7b28d8fefd0382ecd2fb2a16f2b96fc4e848307259883e4770fafb63fc0b4036f5a8f79595465adeb2298746ec22e2630af23bdd3f27f8e5917c97de4d42cde8d01757c22d9e98115a1bd4f290279c339e0ec27265fd0994ec18422175c12b347818b49446244d9969f5ce7861527291770989045cd6aa10a1ca1c602c11d1cd9ddfe7b343b0ababacbd88a4ebe1b4d33dc9ec390d21eb706e3ca220101f79f4e1fce526a2b1817d5f4798d51fcf83dd3a9ae94291dd8af3cc53369acffdbd01d0b03ea106f8faf9066fe05a8910d23b6927c40a3e60b780b05ed3bed1a869d44458261d3a94d38a200dd2cf1e06b2945107db08a4eaf532d6ec80cba9f8a75780683c84f9aadbef97ebcd64248914f5de5bd9f3865ddf24941da9efb26ca07f74314315572398b8c5367264e2289b036d9e64679f974595c55cb3284e4063b245f2a290a2e9f41836c69910b3d3f7f5ba3439936b264c4ee3c3285cdc7dd86ecbeb95666f98d8e573bb52d75e199d50dc40f2f60b5186b69a815c0cce9a6c9d7bfdcd4e60ab43f98fa16229fe7cf006d7af3857b416f448e4f50ab3599a19f3bfdac05c67919c715a25c1eaef03fbac2e23a7889f4b12173f059247089f779c0d	K100df783d2a8b908b144b58f32cb0da34e4b24b80052e02660ea7b3abed2a29eb2::server:741c12bc655f180425422769f49477fc	TERMINATED	2026-07-31 11:28:00.579	2026-08-07 03:27:33.899	[{"ts":"2026-07-31T11:47:02.836Z","msg":"[K3s Reinstall] Uninstalling previous K3s on 172.25.0.2..."},{"ts":"2026-07-31T11:47:31.306Z","msg":"[K3s Reinstall] Installing K3s v1.31 on 172.25.0.2..."},{"ts":"2026-07-31T11:47:31.734Z","msg":"[INFO]  Finding release for channel v1.31"},{"ts":"2026-07-31T11:47:33.069Z","msg":"[INFO]  Using v1.31.14+k3s1 as release"},{"ts":"2026-07-31T11:47:33.070Z","msg":"[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.31.14%2Bk3s1/sha256sum-amd64.txt"},{"ts":"2026-07-31T11:49:42.983Z","msg":"[INFO]  Downloading binary https://github.com/k3s-io/k3s/releases/download/v1.31.14%2Bk3s1/k3s"},{"ts":"2026-07-31T11:49:46.099Z","msg":"[INFO]  Verifying binary download"},{"ts":"2026-07-31T11:49:46.383Z","msg":"[INFO]  Installing k3s to /usr/local/bin/k3s"},{"ts":"2026-07-31T11:49:46.430Z","msg":"[INFO]  Finding available k3s-selinux versions"},{"ts":"2026-07-31T11:49:47.556Z","msg":"Rancher K3s Common (stable)                      35 kB/s | 2.9 kB     00:00"},{"ts":"2026-07-31T11:49:47.749Z","msg":"Dependencies resolved."},{"ts":"2026-07-31T11:49:47.750Z","msg":"================================================================================"},{"ts":"2026-07-31T11:49:47.750Z","msg":"Package            Arch    Version            Repository                  Size"},{"ts":"2026-07-31T11:49:47.751Z","msg":"================================================================================"},{"ts":"2026-07-31T11:49:47.751Z","msg":"Installing:"},{"ts":"2026-07-31T11:49:47.751Z","msg":"k3s-selinux        noarch  1.6-1.el9          rancher-k3s-common-stable   22 k"},{"ts":"2026-07-31T11:49:47.751Z","msg":"Installing dependencies:"},{"ts":"2026-07-31T11:49:47.751Z","msg":"container-selinux  noarch  4:2.245.0-1.el9    appstream                   57 k"},{"ts":"2026-07-31T11:49:47.751Z","msg":"Transaction Summary"},{"ts":"2026-07-31T11:49:47.751Z","msg":"================================================================================"},{"ts":"2026-07-31T11:49:47.751Z","msg":"Install  2 Packages"},{"ts":"2026-07-31T11:49:47.751Z","msg":"Total download size: 79 k"},{"ts":"2026-07-31T11:49:47.752Z","msg":"Installed size: 169 k"},{"ts":"2026-07-31T11:49:47.752Z","msg":"Downloading Packages:"},{"ts":"2026-07-31T11:49:48.721Z","msg":"(1/2): container-selinux-2.245.0-1.el9.noarch.r 1.0 MB/s |  57 kB     00:00"},{"ts":"2026-07-31T11:49:48.775Z","msg":"(2/2): k3s-selinux-1.6-1.el9.noarch.rpm         202 kB/s |  22 kB     00:00"},{"ts":"2026-07-31T11:49:48.776Z","msg":"--------------------------------------------------------------------------------"},{"ts":"2026-07-31T11:49:48.778Z","msg":"Total                                            77 kB/s |  79 kB     00:01"},{"ts":"2026-07-31T11:49:48.809Z","msg":"Running transaction check"},{"ts":"2026-07-31T11:49:48.824Z","msg":"Transaction check succeeded."},{"ts":"2026-07-31T11:49:48.824Z","msg":"Running transaction test"},{"ts":"2026-07-31T11:49:48.839Z","msg":"Transaction test succeeded."},{"ts":"2026-07-31T11:49:48.839Z","msg":"Running transaction"},{"ts":"2026-07-31T11:49:48.849Z","msg":"Preparing        :                                                        1/1"},{"ts":"2026-07-31T11:49:48.880Z","msg":"Running scriptlet: container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-07-31T11:49:48.917Z","msg":"Installing       : container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-07-31T11:49:48.921Z","msg":"Running scriptlet: container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-07-31T11:50:03.744Z","msg":"Running scriptlet: k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-07-31T11:50:03.766Z","msg":"Installing       : k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-07-31T11:50:03.771Z","msg":"Running scriptlet: k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-07-31T11:50:15.273Z","msg":"Running scriptlet: container-selinux-4:2.245.0-1.el9.noarch               2/2"},{"ts":"2026-07-31T11:50:28.731Z","msg":"Running scriptlet: k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-07-31T11:50:28.925Z","msg":"Verifying        : container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-07-31T11:50:28.926Z","msg":"Verifying        : k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-07-31T11:50:29.025Z","msg":"Installed:"},{"ts":"2026-07-31T11:50:29.026Z","msg":"container-selinux-4:2.245.0-1.el9.noarch     k3s-selinux-1.6-1.el9.noarch"},{"ts":"2026-07-31T11:50:29.026Z","msg":"Complete!"},{"ts":"2026-07-31T11:50:29.126Z","msg":"[INFO]  Creating /usr/local/bin/kubectl symlink to k3s"},{"ts":"2026-07-31T11:50:29.147Z","msg":"[INFO]  Creating /usr/local/bin/crictl symlink to k3s"},{"ts":"2026-07-31T11:50:29.167Z","msg":"[INFO]  Creating /usr/local/bin/ctr symlink to k3s"},{"ts":"2026-07-31T11:50:29.186Z","msg":"[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh"},{"ts":"2026-07-31T11:50:29.245Z","msg":"[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh"},{"ts":"2026-07-31T11:50:29.375Z","msg":"[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env"},{"ts":"2026-07-31T11:50:29.454Z","msg":"[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service"},{"ts":"2026-07-31T11:50:29.537Z","msg":"[INFO]  systemd: Enabling k3s unit"},{"ts":"2026-07-31T11:50:29.562Z","msg":"Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service."},{"ts":"2026-07-31T11:50:30.479Z","msg":"[INFO]  Host iptables-save/iptables-restore tools not found"},{"ts":"2026-07-31T11:50:30.500Z","msg":"[INFO]  Host ip6tables-save/ip6tables-restore tools not found"},{"ts":"2026-07-31T11:50:30.500Z","msg":"[INFO]  systemd: Starting k3s"},{"ts":"2026-07-31T11:51:11.107Z","msg":"[K3s Reinstall] Fetching new node token from 172.25.0.2..."},{"ts":"2026-07-31T11:51:11.329Z","msg":"[K3s Reinstall] Cluster reinstall finished."},{"ts":"2026-08-01T04:23:27.246Z","msg":"Starting K3s WORKER installation on 172.25.0.3..."},{"ts":"2026-08-01T04:23:27.253Z","msg":"Waiting for SSH on 172.25.0.3... (up to 5 minutes)"},{"ts":"2026-08-01T04:23:37.271Z","msg":"SSH not ready yet (attempt 1/30): Timed out while waiting for handshake. Retrying in 10s..."},{"ts":"2026-08-01T04:23:48.801Z","msg":"SSH connected to 172.25.0.3 successfully."},{"ts":"2026-08-01T04:23:48.801Z","msg":"Installing K3s v1.31 as WORKER... (this may take 2-5 minutes)"},{"ts":"2026-08-01T04:23:49.418Z","msg":"[INFO]  Finding release for channel v1.31"},{"ts":"2026-08-01T04:23:50.701Z","msg":"[INFO]  Using v1.31.14+k3s1 as release"},{"ts":"2026-08-01T04:23:50.701Z","msg":"[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.31.14%2Bk3s1/sha256sum-amd64.txt"},{"ts":"2026-08-01T04:23:51.366Z","msg":"[INFO]  Downloading binary https://github.com/k3s-io/k3s/releases/download/v1.31.14%2Bk3s1/k3s"},{"ts":"2026-08-01T04:23:55.520Z","msg":"[INFO]  Verifying binary download"},{"ts":"2026-08-01T04:23:55.800Z","msg":"[INFO]  Installing k3s to /usr/local/bin/k3s"},{"ts":"2026-08-01T04:23:55.865Z","msg":"[INFO]  Finding available k3s-selinux versions"},{"ts":"2026-08-01T04:23:56.602Z","msg":"Waiting for process with pid 1165 to finish."},{"ts":"2026-08-01T04:24:03.338Z","msg":"Rancher K3s Common (stable)                     3.5 kB/s | 1.5 kB     00:00"},{"ts":"2026-08-01T04:24:04.132Z","msg":"Dependencies resolved."},{"ts":"2026-08-01T04:24:04.133Z","msg":"================================================================================"},{"ts":"2026-08-01T04:24:04.133Z","msg":"Package            Arch    Version            Repository                  Size"},{"ts":"2026-08-01T04:24:04.133Z","msg":"================================================================================"},{"ts":"2026-08-01T04:24:04.134Z","msg":"Installing:"},{"ts":"2026-08-01T04:24:04.134Z","msg":"k3s-selinux        noarch  1.6-1.el9          rancher-k3s-common-stable   22 k"},{"ts":"2026-08-01T04:24:04.134Z","msg":"Installing dependencies:"},{"ts":"2026-08-01T04:24:04.134Z","msg":"container-selinux  noarch  4:2.245.0-1.el9    appstream                   57 k"},{"ts":"2026-08-01T04:24:04.134Z","msg":"Transaction Summary"},{"ts":"2026-08-01T04:24:04.134Z","msg":"================================================================================"},{"ts":"2026-08-01T04:24:04.134Z","msg":"Install  2 Packages"},{"ts":"2026-08-01T04:24:04.135Z","msg":"Total download size: 79 k"},{"ts":"2026-08-01T04:24:04.135Z","msg":"Installed size: 169 k"},{"ts":"2026-08-01T04:24:04.135Z","msg":"Downloading Packages:"},{"ts":"2026-08-01T04:24:04.135Z","msg":"Waiting for process with pid 1307 to finish."},{"ts":"2026-08-01T04:24:12.081Z","msg":"(1/2): k3s-selinux-1.6-1.el9.noarch.rpm         246 kB/s |  22 kB     00:00"},{"ts":"2026-08-01T04:24:12.101Z","msg":"(2/2): container-selinux-2.245.0-1.el9.noarch.r 529 kB/s |  57 kB     00:00"},{"ts":"2026-08-01T04:24:12.103Z","msg":"--------------------------------------------------------------------------------"},{"ts":"2026-08-01T04:24:12.104Z","msg":"Total                                            82 kB/s |  79 kB     00:00"},{"ts":"2026-08-01T04:24:12.225Z","msg":"Rancher K3s Common (stable)                      29 kB/s | 2.4 kB     00:00"},{"ts":"2026-08-01T04:24:12.388Z","msg":"Importing GPG key 0xE257814A:"},{"ts":"2026-08-01T04:24:12.389Z","msg":"Userid     : \\"Rancher (CI) <ci@rancher.com>\\""},{"ts":"2026-08-01T04:24:12.389Z","msg":"Fingerprint: C8CF F216 4551 26E9 B9C9 18BE 925E A29A E257 814A"},{"ts":"2026-08-01T04:24:12.389Z","msg":"From       : https://rpm.rancher.io/public.key"},{"ts":"2026-08-01T04:24:12.392Z","msg":"Key imported successfully"},{"ts":"2026-08-01T04:24:12.409Z","msg":"Running transaction check"},{"ts":"2026-08-01T04:24:12.429Z","msg":"Transaction check succeeded."},{"ts":"2026-08-01T04:24:12.429Z","msg":"Running transaction test"},{"ts":"2026-08-01T04:24:12.474Z","msg":"Transaction test succeeded."},{"ts":"2026-08-01T04:24:12.475Z","msg":"Running transaction"},{"ts":"2026-08-01T04:24:12.491Z","msg":"Preparing        :                                                        1/1"},{"ts":"2026-08-01T04:24:12.522Z","msg":"Running scriptlet: container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-08-01T04:24:12.593Z","msg":"Installing       : container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-08-01T04:24:12.593Z","msg":"Running scriptlet: container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-08-01T04:24:28.783Z","msg":"Running scriptlet: k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-08-01T04:24:28.804Z","msg":"Installing       : k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-08-01T04:24:28.811Z","msg":"Running scriptlet: k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-08-01T04:24:39.714Z","msg":"Running scriptlet: container-selinux-4:2.245.0-1.el9.noarch               2/2"},{"ts":"2026-08-01T04:24:52.734Z","msg":"Running scriptlet: k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-08-01T04:24:52.908Z","msg":"Verifying        : container-selinux-4:2.245.0-1.el9.noarch               1/2"},{"ts":"2026-08-01T04:24:52.909Z","msg":"Verifying        : k3s-selinux-1.6-1.el9.noarch                           2/2"},{"ts":"2026-08-01T04:24:53.002Z","msg":"Installed:"},{"ts":"2026-08-01T04:24:53.002Z","msg":"container-selinux-4:2.245.0-1.el9.noarch     k3s-selinux-1.6-1.el9.noarch"},{"ts":"2026-08-01T04:24:53.002Z","msg":"Complete!"},{"ts":"2026-08-01T04:24:53.097Z","msg":"[INFO]  Creating /usr/local/bin/kubectl symlink to k3s"},{"ts":"2026-08-01T04:24:53.117Z","msg":"[INFO]  Creating /usr/local/bin/crictl symlink to k3s"},{"ts":"2026-08-01T04:24:53.138Z","msg":"[INFO]  Creating /usr/local/bin/ctr symlink to k3s"},{"ts":"2026-08-01T04:24:53.158Z","msg":"[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh"},{"ts":"2026-08-01T04:24:53.219Z","msg":"[INFO]  Creating uninstall script /usr/local/bin/k3s-agent-uninstall.sh"},{"ts":"2026-08-01T04:24:53.350Z","msg":"[INFO]  env: Creating environment file /etc/systemd/system/k3s-agent.service.env"},{"ts":"2026-08-01T04:24:53.434Z","msg":"[INFO]  systemd: Creating service file /etc/systemd/system/k3s-agent.service"},{"ts":"2026-08-01T04:24:53.515Z","msg":"[INFO]  systemd: Enabling k3s-agent unit"},{"ts":"2026-08-01T04:24:53.542Z","msg":"Created symlink /etc/systemd/system/multi-user.target.wants/k3s-agent.service → /etc/systemd/system/k3s-agent.service."},{"ts":"2026-08-01T04:24:54.501Z","msg":"[INFO]  Host iptables-save/iptables-restore tools not found"},{"ts":"2026-08-01T04:24:54.522Z","msg":"[INFO]  Host ip6tables-save/ip6tables-restore tools not found"},{"ts":"2026-08-01T04:24:54.522Z","msg":"[INFO]  systemd: Starting k3s-agent"},{"ts":"2026-08-01T04:25:03.524Z","msg":"Warning! D-Bus connection terminated."},{"ts":"2026-08-01T04:25:03.524Z","msg":"Failed to wait for response: Connection reset by peer"},{"ts":"2026-08-01T04:25:03.536Z","msg":"K3s WORKER installed successfully. Waiting for services to start (30s)..."},{"ts":"2026-08-01T04:25:33.545Z","msg":"SSH connection was reset by systemd reload. Reconnecting..."},{"ts":"2026-08-01T04:25:33.999Z","msg":"Node WORKER provisioned successfully on 172.25.0.3."}]
\.


--
-- TOC entry 5913 (class 0 OID 79011)
-- Dependencies: 268
-- Data for Name: LoginLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LoginLog" (id, "ipAddress", "emailAttempt", success, "isBanned", "createdAt") FROM stdin;
49	::1	andikaferdi989@gmail.com	t	f	2026-07-04 01:59:27.975
50	::1	andikaferdialvianto@gmail.com	f	f	2026-07-04 03:00:19.654
51	::1	andikaferdialvianto@gmail.com	f	f	2026-07-04 03:00:40.167
52	::1	andikaferdialvianto@gmail.com	t	f	2026-07-04 03:00:52.091
53	::1	andikaferdi989@gmail.com	t	f	2026-07-05 02:13:13.663
54	::1	andikaferdialvianto@gmail.com	f	f	2026-07-05 03:27:42.839
55	::1	andikaferdialvianto@gmail.com	t	f	2026-07-05 03:28:04.557
56	::1	andikaferdi989@gmail.com	f	f	2026-07-06 02:51:02.014
57	::1	andikaferdi989@gmail.com	t	f	2026-07-06 02:51:04.473
58	::1	andikaferdialvianto@gmail.com	f	f	2026-07-06 08:36:04.778
59	::1	andikaferdialvianto@gmail.com	t	f	2026-07-06 08:36:11.764
1	::1	andikaferdi989@gmail.com	t	f	2026-07-07 04:23:44.734
2	::1	andikaferdialvianto@gmail.com	t	f	2026-07-07 13:41:22.959
3	::1	andikaferdi989@gmail.com	t	f	2026-07-08 05:51:52.335
4	::1	andikaferdialvianto@gmail.com	t	f	2026-07-09 07:19:08.51
5	::1	andikaferdialvianto@gmail.com	t	f	2026-07-09 10:11:27.859
6	::1	andikaferdi989@gmail.com	t	f	2026-07-10 08:34:21.704
7	::1	andikaferdialvianto@gmail.com	t	f	2026-07-10 09:54:38.148
8	::1	andikaferdi989@gmail.com	t	f	2026-07-11 08:38:42.516
9	::1	andikaferdialvianto@gmail.com	f	f	2026-07-11 10:33:07.907
10	::1	andikaferdialvianto@gmail.com	t	f	2026-07-11 10:33:26.048
11	::1	andikaferdialvianto@gmail.com	f	f	2026-07-12 08:41:40.137
12	::1	andikaferdi989@gmail.com	t	f	2026-07-12 08:41:46.525
13	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-07-12 12:12:21.938
14	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-07-12 16:14:37.436
15	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-07-12 22:00:51.761
16	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-07-12 23:20:21.714
17	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-07-13 16:25:36.353
18	2001:df4:f80:22:51c4:9afb:f6d7:accd	muhabdullahlx@gmail.com	t	f	2026-07-13 16:27:56.501
19	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-07-13 16:30:47.086
20	103.178.152.6	muhabdullahlx@gmail.com	t	f	2026-07-13 21:27:43.245
21	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-07-14 02:44:25.439
22	45.198.149.134	andikaferdialvianto@gmail.com	f	f	2026-07-20 08:48:15.688
23	::1	andikaferdialvianto@gmail.com	f	f	2026-07-22 14:25:48.408
24	::1	andikaferdialvianto@gmail.com	t	f	2026-07-22 14:26:08.797
25	::1	andikaferdi989@gmail.com	t	f	2026-07-23 08:41:43.399
26	::1	andikaferdialvianto@gmail.com	t	f	2026-07-23 15:49:04.653
27	::1	andikaferdi989@gmail.com	t	f	2026-07-24 08:53:16.309
28	::1	andikaferdialvianto@gmail.com	t	f	2026-07-25 10:22:51.98
29	::1	andikaferdi989@gmail.com	t	f	2026-07-25 10:33:40.938
30	::1	andikaferdi989@gmail.com	t	f	2026-07-26 10:33:51.788
31	::1	andikaferdialvianto@gmail.com	f	f	2026-07-26 12:37:50.945
32	::1	andikaferdialvianto@gmail.com	t	f	2026-07-26 12:37:54.662
33	::1	andikaferdi989@gmail.com	t	f	2026-07-27 12:21:36.938
34	::1	andikaferdialvianto@gmail.com	f	f	2026-07-28 00:11:19.836
35	::1	andikaferdialvianto@gmail.com	t	f	2026-07-28 00:11:22.341
36	::1	andikaferdi989@gmail.com	t	f	2026-07-28 23:04:12.845
37	::1	andikaferdialvianto@gmail.com	t	f	2026-07-29 07:16:37.172
38	::1	andikaferdi989@gmail.com	t	f	2026-07-30 02:45:02.02
39	::1	andikaferdi989@gmail.com	t	f	2026-07-31 03:33:08.701
40	::1	andikaferdialvianto@gmail.com	t	f	2026-07-31 06:56:05
41	::1	andikaferdi989@gmail.com	t	f	2026-08-01 03:51:22.214
42	::1	andikaferdialvianto@gmail.com	f	f	2026-08-01 12:00:57.821
43	::1	andikaferdialvianto@gmail.com	t	f	2026-08-01 12:01:00.845
44	::1	andikaferdi989@gmail.com	t	f	2026-08-02 07:49:57.742
45	::1	andikaferdialvianto@gmail.com	t	f	2026-08-02 13:37:59.506
46	::1	andikaferdi989@gmail.com	t	f	2026-08-02 15:43:50.305
47	::1	andikaferdialvianto@gmail.com	t	f	2026-08-03 14:31:19.002
48	::1	andikaferdi989@gmail.com	t	f	2026-08-04 01:07:06.769
60	::1	andikaferdialvianto@gmail.com	t	f	2026-08-04 15:19:59.559
61	::1	andikaferdi989@gmail.com	t	f	2026-08-05 07:34:17.018
62	::1	andikaferdi989@gmail.com	f	f	2026-08-07 02:45:28.115
63	::1	andikaferdi989@gmail.com	t	f	2026-08-07 02:45:32.59
64	::1	andikaferdi989@gmail.com	t	f	2026-08-07 02:53:18.336
65	::1	andikaferdialvianto@gmail.com	f	f	2026-08-09 08:45:51.94
66	::1	andikaferdialvianto@gmail.com	t	f	2026-08-09 08:45:56.142
67	::1	andikaferdi989@gmail.com	f	f	2026-08-09 08:47:55.459
68	::1	andikaferdi989@gmail.com	t	f	2026-08-09 08:47:59.953
69	::1	andikaferdialvianto@gmail.com	t	f	2026-08-22 09:41:39.684
70	::1	andikaferdi989@gmail.com	t	f	2026-08-22 09:45:04.417
71	::1	andikaferdi989@gmail.com	t	f	2026-08-30 11:26:22.282
72	::1	andikaferdialvianto@gmail.com	t	f	2026-08-30 11:48:21.064
73	::1	andikaferdi989@gmail.com	t	f	2026-08-31 11:34:39.89
74	::1	alviantoa6@gmail.com	t	f	2026-08-31 22:41:37.701
75	::1	andikaferdialvianto@gmail.com	t	f	2026-08-31 22:42:33.513
76	::1	andikaferdialvianto@gmail.com	t	f	2026-09-02 12:34:34.453
77	::1	andikaferdi989@gmail.com	t	f	2026-09-02 13:34:09.882
78	::1	andikaferdi989@gmail.com	t	f	2026-09-04 10:18:16.609
79	::1	andikaferdialvianto@gmail.com	t	f	2026-09-05 07:26:26.008
80	::1	ferdikoclok93@gmail.com	t	f	2026-09-05 11:08:28.374
81	::1	andikaferdi989@gmail.com	t	f	2026-09-05 11:39:02.132
82	::1	ferdikoclok93@gmail.com	t	f	2026-09-05 11:43:00.553
83	::1	andikaferdialvianto@gmail.com	t	f	2026-09-06 08:19:37.541
84	::1	ferdikoclok93@gmail.com	t	f	2026-09-06 08:20:44.638
85	::1	ferdikoclok93@gmail.com	t	f	2026-09-06 11:27:56.158
86	::1	andikaferdi989@gmail.com	t	f	2026-09-06 11:59:07.897
87	::1	andikaferdialvianto@gmail.com	f	f	2026-09-07 09:27:58.587
88	::1	andikaferdialvianto@gmail.com	t	f	2026-09-07 09:28:02.196
89	::1	andikaferdi989@gmail.com	t	f	2026-09-07 21:18:47.378
90	::1	ferdikoclok93@gmail.com	t	f	2026-09-07 22:01:09.568
91	::1	ferdikoclok93@gmail.com	t	f	2026-09-08 01:19:50.628
92	::1	andikaferdialvianto@gmail.com	t	f	2026-09-08 13:05:12.478
93	::1	andikaferdi989@gmail.com	t	f	2026-09-08 22:28:40.43
94	::1	alviantoa6@gmail.com	t	f	2026-09-09 03:17:48.395
95	::1	alviantoa6@gmail.com	t	f	2026-09-09 08:19:48.444
96	::1	andikaferdi989@gmail.com	t	f	2026-09-09 08:45:48.728
97	::1	andikaferdi989@gmail.com	t	f	2026-09-10 00:31:07.011
98	::1	andikaferdi989@gmail.com	t	f	2026-09-10 10:14:59.272
99	::1	andikaferdi989@gmail.com	t	f	2026-09-11 01:47:08.872
100	::1	andikaferdialvianto@gmail.com	t	f	2026-09-11 01:47:32.378
101	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-11 21:50:31.838
102	2404:c0:960a:341d:2512:9491:8fcd:76c1	marlin.hidayat7780@gmail.com	t	f	2026-09-12 02:53:35.786
103	2402:8780:1600::237:8000:87	andikaferdialvianto@gmail.com	t	f	2026-09-12 08:16:30.244
104	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-12 08:21:53.496
105	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-12 22:33:23.066
106	::1	andikaferdialvianto@gmail.com	t	f	2026-09-12 22:43:29.075
107	::1	andikaferdialvianto@gmail.com	t	f	2026-09-12 23:35:09.682
108	::1	andikaferdialvianto@gmail.com	f	f	2026-09-12 23:35:30.524
109	::1	andikaferdi989@gmail.com	t	f	2026-09-12 23:35:52.035
110	182.5.235.105	andikaferdialvianto@gmail.com	t	f	2026-09-13 14:25:45.838
111	45.198.149.134	andikaferdialvianto@gmail.com	f	f	2026-09-13 14:42:51.639
112	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-13 14:43:10.001
113	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-13 22:23:59.644
114	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-14 02:25:16.093
115	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-14 10:11:23.606
116	2402:8780:1073:c12:d972:e9ac:4102:6bcd	andikaferdi989@gmail.com	t	f	2026-09-14 12:10:40.081
117	182.253.122.7	me@masdika.id	f	f	2026-09-14 13:54:34.605
118	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-14 14:15:46.63
119	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-14 18:58:21.888
120	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-14 23:24:58.082
121	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-14 23:45:48.541
122	::1	andikaferdi989@gmail.com	t	f	2026-09-15 02:35:29.033
123	::1	andikaferdialvianto@gmail.com	t	f	2026-09-15 04:41:20.223
124	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-15 10:05:20.823
125	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-15 11:37:53.852
126	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-15 12:11:18.552
127	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-15 12:14:45.53
128	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-15 15:43:13.973
129	157.20.207.209	eccyyulian@gmail.com	t	f	2026-09-16 04:42:28.229
130	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-16 10:30:11.409
131	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-16 23:13:16.727
132	::1	andikaferdi989@gmail.com	t	f	2026-09-17 01:06:38.798
133	::1	andikaferdialvianto@gmail.com	t	f	2026-09-17 01:11:56.449
134	::1	andikaferdi989@gmail.com	t	f	2026-09-17 07:47:38.818
135	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-18 00:39:41.8
136	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-18 11:11:05.703
137	2001:df4:f80:22:b868:d83c:3783:3390	mablx.okt@gmail.com	f	f	2026-09-18 11:21:42.682
138	::1	andikaferdialvianto@gmail.com	t	f	2026-09-18 13:02:25.506
139	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-18 20:45:59.832
140	2402:8780:1600::237:8000:87	andikaferdialvianto@gmail.com	t	f	2026-09-18 23:10:58.392
141	2404:c0:9601:dbf1:1d07:9253:9571:6772	marlin.hidayat7780@gmail.com	t	f	2026-09-19 14:24:20.398
142	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-20 09:57:00.438
143	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-20 09:58:24.891
144	103.255.156.159	gamboge.954@piepla.com	t	f	2026-09-20 13:51:23.194
145	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-21 09:17:21.195
146	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-21 14:56:26.626
147	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-22 00:02:17.778
148	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-22 04:33:11.818
149	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-22 04:42:08.997
150	2404:c0:3179:6cad:a90f:7a94:fdf8:c42b	hacker@gmail.com	f	f	2026-09-22 23:34:19.847
151	2404:c0:3179:6cad:a90f:7a94:fdf8:c42b	hacker@gmail.com	f	f	2026-09-22 23:34:26.592
152	2404:c0:3179:6cad:a90f:7a94:fdf8:c42b	hacker@gmail.com	f	f	2026-09-22 23:34:32.462
153	2404:c0:3179:6cad:a90f:7a94:fdf8:c42b	hacker@gmail.com	f	f	2026-09-22 23:34:57.541
155	103.137.110.249	anandadwi20@gmail.com	f	f	2026-09-23 03:35:40.878
156	103.137.110.249	anandadwi20@gmail.com	f	f	2026-09-23 03:35:50.368
157	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-23 04:01:37.111
158	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-23 05:22:26.286
159	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-23 07:35:42.074
160	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-23 12:17:05.207
161	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-24 04:17:48.925
162	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-24 04:52:24.058
163	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-24 05:21:36.241
164	::1	andikaferdi989@gmail.com	t	f	2026-09-24 12:12:31.343
165	::1	andikaferdialvianto@gmail.com	t	f	2026-09-24 12:23:10.35
166	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-24 21:33:58.805
167	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-24 22:34:24.801
168	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-25 06:26:41.764
169	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-25 12:14:08.148
170	45.198.149.134	andikaferdialvianto@gmail.com	f	f	2026-09-25 12:16:35.506
171	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-25 12:16:40.129
172	::1	andikaferdi989@gmail.com	t	f	2026-09-25 14:53:38.206
173	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-26 00:54:20.067
174	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-09-26 00:55:21.903
175	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-26 02:41:21.476
176	45.198.149.134	andikaferdialvianto@gmail.com	f	f	2026-09-26 12:58:40.016
177	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-26 12:58:58.393
178	2402:8780:1600::237:8000:87	andikaferdialvianto@gmail.com	t	f	2026-09-27 19:55:56.626
179	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-27 21:31:16.904
180	103.137.110.249	anandadwi20@gmail.com	f	f	2026-09-28 08:06:35.471
181	103.137.110.249	anandadwi20@gmail.com	f	f	2026-09-28 08:06:39.67
182	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-29 22:29:02.019
183	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-09-30 08:53:03.993
184	158.140.171.123	andikaferdialvianto@gmail.com	t	f	2026-10-01 00:38:38.772
185	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-01 09:30:07.062
186	104.239.33.69	mamatracing@ndelereng.online	t	f	2026-10-02 04:49:57.955
187	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-02 06:33:52.305
188	2603:7001:ea00:379e:d5ec:f16a:8a62:b1f2	mamatracing2@megawati.cloud	t	f	2026-10-02 06:40:48.847
189	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-02 09:55:49.238
190	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-04 07:16:14.194
191	::1	andikaferdi989@gmail.com	t	f	2026-10-05 09:28:14.053
192	::1	andikaferdialvianto@gmail.com	f	f	2026-10-05 09:36:09.318
193	::1	andikaferdialvianto@gmail.com	t	f	2026-10-05 09:36:13.796
194	::1	andikaferdi989@gmail.com	t	f	2026-10-05 11:24:54.52
195	::1	andikaferdialvianto@gmail.com	t	f	2026-10-06 09:39:53.19
196	::1	andikaferdi989@gmail.com	t	f	2026-10-06 11:27:31.179
197	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-07 10:24:02.382
198	103.190.46.109	lionel.raffa007@gmail.com	f	f	2026-10-07 12:47:37.788
199	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-07 23:15:45.482
200	45.198.149.134	andikaferdi989@gmail.com	t	f	2026-10-08 08:37:53.722
201	45.198.149.134	andikaferdialvianto@gmail.com	t	f	2026-10-08 16:12:21.402
202	::1	andikaferdi989@gmail.com	t	f	2026-10-08 22:22:29.661
203	::1	andikaferdialvianto@gmail.com	t	f	2026-10-08 23:25:47.333
\.


--
-- TOC entry 5915 (class 0 OID 79026)
-- Dependencies: 270
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Message" (id, name, email, subject, content, "isRead", "createdAt", "isVerified", "otpExpiresAt", "verificationOtp") FROM stdin;
8	enc:90dd2af0d4071ce57cce4b77261cb98f5524a9c2d56c7823273f852997576528	enc:b6f59cb40141156e320bd3101e64d653e03fb96f7d99bb73e5754aa72ac80583	enc:086fd3bc2e9f2f04232059d1fba4e98fd44069fea594ee8e58c1526ea134f42a34d71d55bfb71216bf338a6d5242b459	enc:a1b3c1d4278923ec3969ad016528a4aa582575d918735408e80dec8da82b1fbdf50e390cfc51d2e7bc43500eb41e791efc22b7ce58c00b965a28212ed33b8ead79271fdbafb19f907d55fdcadc3bc42f3f194665816235e91f8bf4ef396eb925bcad2a7a38b4a3f563cab700eaa595804241e08e7b9addbab6f1bfe80e101be2dafe0c225045851ef4ff2d5612547af2	t	2026-09-23 07:13:47.901	f	\N	\N
\.


--
-- TOC entry 5917 (class 0 OID 79043)
-- Dependencies: 272
-- Data for Name: Opportunity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Opportunity" (id, type, title, slug, description, image, link, date, status, "isNew", "createdAt", "updatedAt") FROM stdin;
6	JOBS	🚀 We're Hiring: Database Administrator (DBA)	were-hiring-database-administrator-dba	Apakah kamu seorang database professional yang passionate dalam menjaga performa dan keandalan sistem database? Kami membuka kesempatan bergabung bersama tim kami!\n\n📌 About:\nSebagai Database Administrator, kamu akan bertanggung jawab atas pengelolaan, pemeliharaan, dan optimasi infrastruktur database perusahaan — mulai dari daily operations hingga high availability strategy.\n\n🎯 Yang Kami Cari:\n• 5+ tahun pengalaman sebagai Database Administrator\n• Menguasai salah satu atau lebih: PostgreSQL, MySQL, SQL Server, atau Oracle\n• Berpengalaman dalam backup & recovery, replikasi, dan performance tuning\n• Familiar dengan database security dan solusi high availability\n• Memiliki kemampuan troubleshooting dan optimasi yang kuat\n\n💡 Kami percaya bahwa database yang solid adalah fondasi dari bisnis yang scalable. Kalau kamu ingin berkontribusi langsung di area kritis ini, kami ingin mendengar dari kamu.\n\n📩 Kirim CV kamu ke: https://lnkd.in/dEgEvEa5\natau email: marchell.r@dikshatek.co.id			\N	PUBLISHED	f	2026-06-15 06:20:43.68	2026-06-15 06:22:19.585
13	JOBS	🚀 We're Hiring: DevOps Engineer	we-re-hiring-devops-engineer	Passionate about automation, CI/CD, and building reliable infrastructure? We're looking for a DevOps Engineer to join our team!\n\n🔹 Min. 2 years of experience as a DevOps Engineer\n🔹 Strong experience with GitLab CI and CI/CD pipeline implementation\n🔹 Proficient in Linux administration and server management\n🔹 Hands-on experience with Ansible, Bash, and Python scripting\n🔹 Experience with Grafana and Prometheus for monitoring and observability\n🔹 Familiarity with Nginx, REST APIs, and application deployment processes\n🔹 Strong troubleshooting and problem-solving skills\n🔹 Fluent in English (written and verbal)\n🔹 Collaborative mindset with the ability to work effectively across cross-functional teams\n\n📌 Key Responsibilities:\n✅ Design and maintain CI/CD pipelines\n✅ Automate infrastructure and operational processes\n✅ Manage Linux servers and optimize system performance\n✅ Implement monitoring and alerting solutions\n✅ Support deployments and production environments\n✅ Troubleshoot infrastructure and performance issues\n✅ Drive continuous improvement through automation and operational excellence\n\n📍 Location: Jakarta (Onsite)\n📄 Employment Type: Contract (Extendable)\n\n#Hiring #DevOps #DevOpsEngineer #GitLabCI #Linux #Ansible #Python #Bash #Grafana #Prometheus #CI_CD #Automation #Infrastructure #TechJobs #JakartaJobs #OpenToWork	\N	https://www.linkedin.com/jobs/view/4428473797/?trackingId=tvtqw6ltQV6zR1JyPTQhgA%3D%3D&isJobSearch=false&lipi=urn%3Ali%3Apage%3Ad_flagship3_feed%3B746P7ESJRzaMfSbi6%2FxqBg%3D%3D	\N	PUBLISHED	f	2026-06-18 14:09:52.437	2026-06-18 14:09:52.437
14	JOBS	📢 We're Hiring - CloudOps Engineer	we-re-hiring-cloudops-engineer	PT Boer Technology (Btech.id) sedang membuka kesempatan bagi talenta IT untuk bergabung sebagai Database Administrator.\n\nQualification\n-Minimum education SMK / D3 / S1\n-At least 1 year experience in operating Linux System\n-Have experience with Docker, Kubernetes, OpenStack, or similar clustering applications\n-Have the ability to manage public / private cloud like OpenStack, GCP, AWS, Azure\n-Have scripting bash skills (bash, python, or other programming languages)\n-Have the ability to create monitoring and alerting like Grafana, Prometheus, Alert manager\n-Willing to work onsite in Jabodetabek with shift scheduling\n-Have a great interest in learning new technologies\n\nAtau kunjungi halaman Glints PT Boer Technology untuk informasi lebih lanjut.\n\n#Hiring		https://lnkd.in/gQrnywfA	\N	PUBLISHED	f	2026-06-19 14:36:07.055	2026-06-19 14:39:20.368
11	JOBS	Nexmedis is Hiring	nexmedis-is-hiring	We're looking for a talented DevOps Engineer to help us build and scale the infrastructure behind our health-tech solutions.\n\nIf you're passionate about automation, reliability, and cloud technologies, we'd love to hear from you.\n\nFull-time | Hybrid\n\nApply now: bit.ly/NexTalent\nApplications will be reviewed on a rolling basis.\n\n#NexmedisCareer #DevOpsEngineer #CloudEngineering #Infrastructure #TechHiring #HealthTech #WeAreHiring\n	/uploads/jobs/jobs-1781749118750.webp	bit.ly/NexTalent	\N	PUBLISHED	f	2026-06-18 02:18:44.942	2026-07-09 10:40:03.297
17	JOBS	We're Hiring: Junior DevOps Engineer	we-re-hiring-junior-devops-engineer	The Software Practice is looking for a Junior DevOps Engineer (Fresh Graduates up to 3 years of experience) to join our growing engineering team.\n\nLocation: Bandung, Indonesia (open only for Indonesian)\n\nAs a consulting company, you'll work on client-facing projects across different industries, helping build and maintain cloud infrastructure, deployment pipelines, and DevOps best practices.\n\nWhat you'll be working with:\n- AWS\n- Kubernetes\n- Terraform\n- CI/CD (GitLab CI/Jenkins)\n- Docker\n- Linux\n- Azure\n- Cloud Infrastructure & Automation\n\nWe're looking for someone who is:\n🍇 A fast learner\n🍇 Proactive and resourceful\n🍇 Comfortable working independently\n🍇 Passionate about cloud technologies and DevOps\n🍇Whether you're a fresh graduate with strong hands-on projects or have up to 3 years of DevOps experience, we'd love to hear from you.\n\nFeel free to like, share, or tag someone who might be interested! See ya!	\N	https://lnkd.in/gTcHSfC2	\N	PUBLISHED	t	2026-07-06 12:25:57.826	2026-07-06 12:25:57.826
15	JOBS	We're Hiring - IP NOC ENGINEER (Internet Protocol Network Operations Center)	we-re-hiring-ip-noc-engineer-internet-protocol-network-operations-center	Halo rekan-rekan Linkedin! 🚀\n\nSaat ini, Trans Hybrid sedang mencari talenta terbaik untuk bergabung mengisi posisi IP NOC ENGINEER (Internet Protocol Network Operations Center).\n\nJika kamu memiliki kemampuan analisis yang tajam dan siap bertanggung jawab atas kestabilan, performa, serta ketersediaan infrastruktur jaringan secara real-time (24/7), ini adalah kesempatan yang tepat untukmu!\n\n🔍 Kualifikasi Utama (Hard Skill): \n• Protokol Routing: Pemahaman mendalam tentang BGP (termasuk konsep AS-SET, peering, dan transit), OSPF, IS-IS, dan statik routing. \n• Switching & Layer 2: Menguasai konsep VLAN, STP/RSTP/MSTP, LACP, QinQ, dan Port Security. \n• MPLS & Backbone: Memahami teknologi MPLS, L3VPN, L2VPN (VPLS/VPWS). \n• Perangkat Jaringan (Multi-Vendor): Mikrotik, Juniper, Huawei, Cisco. • Tools Monitoring: Familiar dengan Zabbix, Cacti, PRTG, The Dude.\n\n⭐ Persyaratan Tambahan: \n• Menguasai virtual tools (Proxmox) dan dasar-dasar Linux akan menjadi nilai tambah (Plus Point). \n• Mampu bekerja sama dan berkoordinasi dengan baik bersama tim (Internal maupun 3rd Party). \n• Bersedia bekerja dengan sistem shift. \n• Memiliki pengalaman minimal 2 tahun di posisi yang sama.\n\n📩 Cara Melamar: \nKirimkan CV dan surat lamaran terbaikmu ke email: \n✉️ Recruitment@transhybrid.net.id\n📌 Subjek Email: Nama_Posisi yang dilamar_domisili\n\n#LokerIT #LowonganKerja #NOCEngineer #NetworkEngineer #IPNOC #TransHybrid #LokerJaringan #Hiring #TechJobs #InfoLokerIT #Loker	https://media.licdn.com/dms/image/v2/D5622AQH7riQXGPfVJQ/feedshare-shrink_800/B56Z7dZ8t0G8Ac-/0/jobs-d12QM56txY5CYq-gDBgJU32IR8xLSYzOmBc06ME	mailto:recruitment@transhybrid.net.id	\N	PUBLISHED	f	2026-06-19 14:42:06.931	2026-07-09 10:40:03.3
1	JOBS	We're Hiring - Server Administrator 🚀	we-re-hiring-server-administrator	Kami sedang mencari Server Administrator yang berpengalaman untuk bergabung dengan tim kami dan mendukung operasional infrastruktur IT di industri perbankan.\n\n📍 Position: Server Administrator\nKualifikasi Utama:\n ✅ Pengalaman mengelola server di lingkungan Data Center (DC) & Disaster Recovery (DR)\n ✅ Mampu mengelola sekitar 30 server\n ✅ Memiliki sertifikasi Server Administrator (lebih disukai)\n ✅ Memiliki sertifikasi Oracle (nilai tambah)\n ✅ Memahami Windows/Linux Server Administration\n ✅ Bersedia bekerja Onsite dan memberikan Remote Support sesuai kebutuhan operasional\n🎯 Jika Anda memiliki pengalaman dalam menjaga performa, keamanan, dan availability server serta tertarik bekerja di lingkungan perbankan, kami ingin bertemu dengan Anda.\n\n📩 Silakan kirim CV terbaru Anda melalui  email ke: elen.margaretha@prodain.co.id\nMari bergabung dan tumbuh bersama kami!\n\n#Hiring #WeAreHiring #JobOpening #ServerAdministrator #SystemAdministrator #InfrastructureEngineer #ITInfrastructure #WindowsServer #LinuxServer #Oracle #DataCenter #DisasterRecovery #Banking #TechJobs #ITJobs #CareerOpportunity #OpenToWork #IndonesiaJobs #LinkedInJobs #HiringNow	\N	mailto:elen.margaretha@prodain.co.id	\N	PUBLISHED	t	2026-07-10 09:55:15.918	2026-07-10 09:55:15.918
\.


--
-- TOC entry 5919 (class 0 OID 79060)
-- Dependencies: 274
-- Data for Name: PageView; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PageView" (id, "ipHash", "createdAt") FROM stdin;
2	eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3	2026-06-12 15:16:36.915
3	28456aae48f912eae8a5f045eee79449577bfe8446a999c519a8fcdc7c32a415	2026-06-14 12:20:52.123
4	a58f39e0f2d1065afdd5e7e17806c0a5502402fa8484d45c0b1d4caf9f952758	2026-06-14 12:23:07.678
6	91bc877a8a5fc4882ca4a4402257038888761ddd46bda38346e3d72caa7312d5	2026-06-14 13:56:24.02
7	8db10267f01ef38e826651a09df9926570a4691e1ce5168b415334b4b2c59a52	2026-06-14 14:26:37.908
8	83e606715b7d2c7c134b509f2a2732cb9eeb3f7189cb63ff8783d9e656b76e07	2026-06-16 02:13:47.714
9	02d6ddb83c29db7d5025a6ca8a6c8b4b50753bfe113f7205ac057c8ed1ea1c10	2026-06-16 02:13:47.862
10	909f6405dd221796ab2f868d88ebbac8656bfc38bcb787cbdfa3a5ea19b02b4e	2026-06-16 02:15:18.974
11	cd8e17445ae7ad774346b7fe3d3d7908f6cd074440a209e4e70b572fa33733c8	2026-06-16 02:15:42.699
12	9d68e6eb609099890246ed0c107a407ed956299abfd0f555c3e9310b77ed2413	2026-06-16 02:16:06.476
13	49d706b8b4d7670f45ea548bbc845391dc02874fd08bebc3d5438a0421a87d73	2026-06-16 02:16:30.739
14	8786446f74d5e7ad977abdabdabbe354d297448798105e05ba697c4125e994ca	2026-06-16 02:16:57.033
15	edc02dc69315d361ade78f1f139618ec25b7a5c2b1523fcaae3aaf713d0a3d86	2026-06-16 02:17:20.568
16	acfb7beda10a83ddf25e67d1a68598b0a98c877518809400d7cb6381aabdbcb9	2026-06-16 02:17:46.258
17	ba82b75ccaebabfeb48aecebef3bd2d68d39a76c5efdecb4698a758a37cd2422	2026-06-16 02:18:10.255
18	142c1341d9e97527dd834d143faf64117e1dbdaaafb02bcf8a238b44c0d1d94a	2026-06-16 02:18:34.406
19	14dc1bca39d5d6270225f5e04532042fb7be85e737a2a23b080d3a6b0e32bf7c	2026-06-16 02:18:59.572
20	74f1f5c2bc08e0373f0bfb3f54d59d916f3877462f31e714cfd11e91131d3223	2026-06-16 02:19:23.525
21	d18c27ee99b10baaed8543ff08e68de3ae00b2b1782db39e630bda1ee1e4317d	2026-06-16 02:19:49.227
22	29e15fd0d2e4fa81bcd72a6a6a051b27188bd415c8d3fca6776f5cbde8199b8f	2026-06-16 02:20:13.473
23	a7f2406b6b0df6cfac28cef3efaea3f1af8e6c74c6f48ff08cb2a60add0dc752	2026-06-16 02:20:37.502
24	6f9b593181d7f0b613c33a9a9cafe7ee0595c35b22d92e1b401cba8ffaf2a14d	2026-06-16 02:21:03.981
25	d03c164a00dacbaa3ab36f9ecbe889e03e1b45cf19fb0aa8c5021c17cf000016	2026-06-16 02:26:59.22
26	0781370a9d42404fb334855d74b33fbcac99eb8d248636d7559211a76bc8b5a6	2026-06-16 02:27:15.208
27	cbe6b734481cf6ab10acd4da4e3acaf30b721340407363402811059a90fd027c	2026-06-16 02:40:59.153
28	0a07a3a3cc177b622beb165c45b00ad0f34a3344a592871638945fd51b0f4c22	2026-06-16 02:45:47.863
29	eee45f4311f6eac3af9eb448c1662a5683e7b7dced7553f956f1f5671c374c2e	2026-06-16 02:46:31.017
30	46194d397668c39fb47a1db45296a813d71897cce8653e7d38e102ee99199ccd	2026-06-16 03:00:08.21
31	2654ed692f915e8783871334e8460b906d74dab5b59a8f8d5b0233e665f1ea2e	2026-06-16 03:34:21.142
32	52094d1cc223e80fddba4d67ab2ae462d3a76f890087d89fa86ba0df69218870	2026-06-16 03:35:05.514
33	114a7e064ce8cc6a697d6686095e94ef514dc90746087ff7043abe430ed01e7d	2026-06-16 04:31:36.341
34	fef8c3186e1260aaa232171a660e0460e567fd2c7d3b091b7843c44d5e63c03e	2026-06-16 04:54:35.767
35	bce663c18f22de2b02bbe2968e4de228a3f5cb337f6654e7145bef4c37ad6a98	2026-06-16 04:58:58.448
36	18ee73ce7277290809575e6c1cc2438117b71213fbbd39c4cf203162fb402505	2026-06-16 05:09:30.425
37	2c8bd39098226e7d8de7fbd1c39cbcc0ed65827a9c828ae4cc1412ebdf23d6ab	2026-06-16 05:23:08.702
38	e9c46dc8d9e5ed51f1eb01c377384fc8356ef3c58edaed3e998a00089252c5b9	2026-06-16 05:30:31.158
39	dda18ecd24a5efd3a3412cf8d725ac5cd717b1b993521dd8bd31892c7c99baaf	2026-06-16 05:31:19.519
40	dcb8773d94d26ae721f89aedc6778dd21e089411ffd49c03328a55dd17908f23	2026-06-16 05:32:14.925
41	cc68f6b92409694b23f2f008fabb26401725d162f050a082089c2d8a1c17e897	2026-06-16 05:34:46.802
42	92f1db9d67ffd45055ecb35e538336c7c88f402c6efa17c45372457c73ea13c7	2026-06-16 05:34:56.888
43	a7772d3b80fdc1f676feb41827eb50bf4bafd5bbfe04013e1d294b735daba527	2026-06-16 05:59:54.514
44	baf4d56be25a60070ca2433939ca3109e36b529a45d3300b79ae6d94e97816c6	2026-06-16 06:08:33.036
45	ef8f5389109b5ab019c97f0d784fb2f47ae9902f3324fec3c3bd22a1f298f638	2026-06-16 06:12:34.316
46	994ede91a2771029c45309dd4005388c0b97ad58539f2c0654ae9b24f3ae84a8	2026-06-16 06:14:33.073
47	2ae45ee9d7733b3e0121b39f3170c935eeac72cc6f0ccd87cf710541080444a9	2026-06-16 06:15:43.549
48	dbc75be5e1d4f99ebdb0a4a662113638f476d016f152d4f073495b47ddd07a1e	2026-06-16 06:16:04.906
49	fe11514d80c6db2c326b84e677aff3fa56f8b11d7dd634e19b7ff573b2a52c46	2026-06-16 06:29:32.085
50	c610803e9ca34c562706d4d5ab53dcea652ab40d51bd9ebc82b214828c9dd22f	2026-06-16 06:37:07.24
51	a40df3305f9d715780e685adb0ad252dc19665288364bf868026aad064a99d19	2026-06-16 07:31:18.589
52	3548aa099d4af937c18c60cf97c977bc15c9ebf24c2dfdfaf366d51d951320f5	2026-06-16 07:37:43.84
53	28da367a297e328ef99d63b242b228870cb1b08812a5661200e326c5d2f04ef0	2026-06-16 07:55:49.229
54	6cc5e2a2b9eb4f705f5431e68072c32125addd591452e88d165c3f4df5ce7f78	2026-06-16 08:00:58.079
55	d22c085c3ad957d4f0d6f67df019d319e68a61a31fb3d070dc57eeb50089ca8a	2026-06-16 09:10:39.9
56	9940eab4566ebbb75fb5768af905f6cf29eee7c80df28a3130ef666c5f6a95fe	2026-06-16 10:26:46.029
57	0baca49d0bd69447b6934865b1a989fa8e6efdc8040706d2e69fe2b4c7e780aa	2026-06-16 10:26:46.159
58	2ab326de2d3cd344d2cf5d38860a7414372b22cc2bdd03441f18fc5c6a3ddd5d	2026-06-16 10:27:33.232
59	fd9371298f30ba2b1a5eaed510e51242c85fc0ce7d3f559a1e112a1e50791b4e	2026-06-16 10:27:56.93
60	5ff5155d3095e45120af8e9411135d7d8f657c96fe4783f88d9ace7d682c0d5c	2026-06-16 10:28:22.417
61	aaaa6b2832632c0d372b63007e266f514463ea80c300fd5edd9d4825a5cd9d07	2026-06-16 10:28:45.371
62	93eaa0295a132bd8310787ad2e6d61fdb5fafc666399f9ca03001799b68606c2	2026-06-16 10:29:09.19
63	23729360c79c067d42491859f45977437304ccbb8074e1b3df68bebf75a5d88f	2026-06-16 10:29:35.008
64	77b80b4fc764cfd01b47149146a75134ff302fdc2fbbf94c685e7e4660908aef	2026-06-16 10:29:59.246
65	313f50ada41d5373dceca5720e0818d2afa1337c7f0de3fe16e4edb6e45ab648	2026-06-16 10:30:23.924
66	34fed609cf983e094407788874fb028a71da7d3b9032ed9306aa78e732bb2e35	2026-06-16 10:30:48.147
67	700444afe1f902e048cb8b762894efff2e3d02421ddcfc3df6136d88bdbb2a1f	2026-06-16 10:31:12.498
68	8a6c11918d688cd51a9f86a729b224a6de3d6fec242909bbc8e6b028dc022e7d	2026-06-16 10:36:40.601
69	09f7000d655aea80dc754a30c1299e21c9a69144e130facdecea79a57098d360	2026-06-16 10:37:05.218
70	9736f6048d0f454d5b9dac4612879f4f42d1a354d13da17f1de3a2f2eb880690	2026-06-16 10:37:29.673
71	3cb62c275244d7be71f5470eb77ec606cdc380a2f5108b7b6e38352e71f69f0e	2026-06-16 10:37:54.991
72	cf4805c5c8e156a26ef718f6321e8dbbb9ee40720037a12f315eb28846aa89a9	2026-06-16 10:38:19.492
73	7c7abd30999c1332edd613e67141c5fe9ab72b8d1bd267699577683d580f6497	2026-06-16 10:38:43.45
74	2060a8e06c212bce38881d4bf7b9a1c3530de0b1b16d68425c1fa5e3a735cdd5	2026-06-16 10:39:27.816
75	051bd4201d8151ab0db53355f3699a2d73945f40d322523d342933abe5517cd3	2026-06-16 10:57:11.675
76	ba971a045fe28cb17eb1e43b44f93c60d68c28ba5aeab02b2a70f884915d200b	2026-06-16 11:20:52.859
77	81d9942bfbe7d20901bdaf8fffc4f546e52d1934eb4663a57154d3dfd9692886	2026-06-16 11:27:57.846
78	2caec8ffede52242d74e74ea1a3e9f10dcbe3b55e4553e0ee6ff365ac461b306	2026-06-16 11:28:59.102
79	9f0c5206acfab9dc0549c64c132ae11ef7af28daf611277e041b2b68b8986b59	2026-06-16 11:59:47.375
80	e9234d0a33552df940778c632a568d5877e5bcd8c643b3a52e74c2232935d2dc	2026-06-16 14:56:31.373
81	ff4f73f647cc8370b13ba87bfd900958a9737258019ad26523401fd054bf8612	2026-06-16 14:57:32.676
82	908fd778357d11df0e5fea9755315efb8e7bb9821633ba5362fbd68174b4c9d3	2026-06-16 14:58:00.355
83	4e0c86ff6c67c56f9e3358ec631896b3be1c4b06d92beca31d9d848415a27853	2026-06-16 14:58:21.75
84	e5c274f2ab9253de9f63cc212ff6a32890523e64f7a112e6026620c5280d20d4	2026-06-16 14:58:46.213
85	2019cd0e3ec9d56917d9143416fd343acc1da91b4ae254c5a0dbb010676d1a0b	2026-06-16 17:11:19.631
86	2461e9819eb6959b1c756f436f354e5037120d7fddbe9c0b420b0ecc1329d97c	2026-06-16 19:04:38.335
87	3daa9a49f4c0af86ec9a27df539288dc878a37e1b8452727b6b894568ce8fbf9	2026-06-16 22:02:21.273
88	a9dd543e507240ab4c4fd6308f683800107419df49e278b00a9b7885b3f05548	2026-06-16 22:02:44.955
89	1a57cdc9b79d1dc65342438326c9ef5420a6c1d4804d409de1fa09ea7161b52c	2026-06-16 22:03:08.46
90	7c46a8806bc77046a125a0ec1a2d9d593e5aa9146c93a320879293adc22ae131	2026-06-16 22:03:33.335
91	ee09065ec232bb58d47f5d76191a4ce82125da3e14acbed4b4ebec2b9c560300	2026-06-17 15:23:42.299
92	d8421cae8d498acac99479ffe8883caac8aec454556a724866355a426b4cbda9	2026-06-17 15:36:49.428
93	d3ce73fc741079476bb4b69ec1feb3385137081ae56a1e4a6884ce1bc02a91be	2026-06-17 15:51:01.432
94	c79671cd3925ab6de270de2bfc0bb0a03f787f7792e0536a897998018f78a665	2026-06-17 16:44:26.909
95	5ce5032805c957c754041f0c2d5b5a8298eb491e8da2862300f92d9e67f43cf2	2026-06-17 17:03:15.281
96	62872517bdd78f1f3b954049c6b7d71b220d36f633139a94572c9261e57d8bdf	2026-06-17 17:03:18.591
97	dfcd56452d540138436ef8a33b603b37ac12c144af5e99b14cd9e23fd2fd6864	2026-06-17 17:04:06.862
98	8964f1d773dff206153d7465d0dd2d3fb6499f6e5af432dcadf51c12c4d9a353	2026-06-17 18:26:59.666
99	ea327cd897f0b373d49c6d35db105454257d4f65b69d3275cd728644c07e13e8	2026-06-17 18:34:03.571
100	b9049d4551bb88150b5d99e828d7f2f4ecfa7d9edd2c8bb2e4d8452e60d7293c	2026-06-17 19:17:26.844
101	38404f47106a092e67a8da6784954688d0c3d555ad41d689468a0808d901cf89	2026-06-17 19:30:29.185
102	6ba10824103421a328f41e700f58af636a20df433623b0bd0a904d69aae70a56	2026-06-17 19:53:42.866
103	c8a32547d18017d41ceb3d3281f724c54bbf6bf8b3295aa6bb389c3458ad9b90	2026-06-17 19:54:05.326
104	b8d116fb30e019b1c6fc3adc27cb7c1c6c2dd7cd6cd0ae11bfe90831c5e9e6fe	2026-06-17 19:54:30.887
105	f0fadb5a123b730d06aaef1b06c8b8220fe1948b0b1b8ef2db2f88719ea45075	2026-06-17 19:54:55.392
106	443818147dd737158459e2fe6e1dfed4d627d0011d6d824adeccd276025dc31c	2026-06-17 19:55:19.364
107	ab85fbf12bb0acee193a9916991d2af46337a4293e78a08c0823fd9ba9de7715	2026-06-17 19:55:44.753
108	524d949e4b1038d45865c2daf01520e093432b9b011310e0f0348ee8564efa43	2026-06-17 20:47:49.907
109	29d04ac353026edde218af1ba15d3e6400817e38a391090b0be558a8d80e4877	2026-06-17 21:07:00.616
110	60053decb0ef2acadfaf46e8229892374b6518982b0502a7c65eb80c4c1fdb80	2026-06-17 22:12:59.879
111	f74ee2fe7480c98cfd7fd4900b0ad24514b7bc8f6542050cf57e498d4b038c7b	2026-06-17 22:31:23.657
112	cc664cb510ede2103182ca8e58b1735e6571844e2e57b7fdef9a1312b09940a5	2026-06-17 23:32:19.633
114	a4d40a1e8b77f25ed2b6ce7836ed4da7b878f8c7f8a6104e1ac7c5a4ef015e96	2026-06-17 23:45:33.602
115	4b4f3d4beba43c2154c9ca3e582099d1bd13b1dd1fa9859d8cd322b3f0b929bb	2026-06-18 00:18:16.998
116	10dcc8429b45e29dab97b615d5a6489a4082415505f8c1ddfc2d28eb7241eaa7	2026-06-18 00:37:57.568
117	c5fff1c09d4dcff1e6d09718daa4981a29dbf38be4d542383a7fc27f77c3f5f5	2026-06-18 00:57:54.359
118	4aadcdf05afe6c28b594dc54703a5e813b04080addd27133535fb956ed58cf6b	2026-06-18 01:04:09.988
119	691743d8b3affa661b4d192b9bd6878bb759dd0288638a4a0ab54837698d4f7d	2026-06-18 01:27:57.549
120	af7e38f39ff18dcfb7fa2f82a7cb599c815045cfa4b9f5a838739eb395c69cc9	2026-06-18 02:12:07.393
121	be5d0d2272a691729b1d8f865e8a16aa8f001e48314a991130900ed36944e5c7	2026-06-18 02:26:42.122
122	e4ffaca924b93f5d27b93129a0d54b652975cb39924be659c616341e0f7d0a7d	2026-06-18 02:33:09.402
123	a1bb24cb6f1c211cb82745005c2eb0907257113fe3c3eebf79ba834ac201a72d	2026-06-18 02:33:13.165
124	38890870de8572c031b962dfb41916c7cfbe4be4f7274ea1085959c32c095007	2026-06-18 02:39:29.072
125	e745936674ad569bc567e40914d5f4d26e25cdc8bd59f1f040f53f6c1e1253e9	2026-06-18 02:41:07.367
126	d50dee682a01c47920bfb0b2caa6d59c8f1eb9b31ac343b855f819c8052e50d5	2026-06-18 02:42:01.462
127	4887de7e43ac30bc3a37718c16d3f26e3ca322e74f487bb7c1188d38e4107529	2026-06-18 02:43:24.502
128	4484d9a57a55b04dc6fc0cee58345bbafdee4be8732a1229085bb7a12758bf0d	2026-06-18 02:50:36.741
129	c1ffa311c0975ce937e7828b409dc57d5d78ec568b333162d767486b0c561c7f	2026-06-18 02:53:46.738
130	6f3c9c019c3fc06e1dd6cad846abb8b1841ff34581c93068dd8b988a9bf92b3b	2026-06-18 03:19:03.739
131	894ea2962cb6d05089aebf921887527a899670fcee998a72560e79d22084a2b9	2026-06-18 03:20:26.337
132	357106218ec7b6afaaac506aa61e138a7b6e6abba8f86a8cfe34819b36bf154e	2026-06-18 03:23:58.705
133	79bc4de03cbf832c6e96d1c260475f94c55492891827dc8c1d29add9b848d4ca	2026-06-18 03:24:17.91
134	452d431372c9b9ef814c31260540a3b39e3eb0079622e478fbb56a0a34d98666	2026-06-18 03:24:24.02
135	e51876198152b0d4a110f5b2feaefc661ce5f80d87d6cdad659ae949ff20a018	2026-06-18 03:24:40.641
136	0bd2a3c77d54bd265759ac3e05485cb47172f5a2c12ceedd3325e5ec071a0f6e	2026-06-18 03:25:05.885
137	561b306188c64418ff0af8d697a9d535f4fd4b6ffe96337bf1086ca3bbb9b24b	2026-06-18 03:25:32.713
138	b6b3af248763278fa12245e546f2c52403c1e4f8f76815160c5a4a918af8d293	2026-06-18 03:25:53.149
139	5c647b88871dde1d999e93eec7c2e31be38d250ac512d52cc121181239810962	2026-06-18 03:27:28.248
140	4e890e20b1c5b1e50b4f843d22e3f3aa6993299e22c159af018a6567e5b0e7b6	2026-06-18 03:29:51.446
141	5a7aa7c3f2e18fb92f0225c533e91f55873b376a9380fb468376ab94ae50dde2	2026-06-18 04:07:28.652
142	77b73f1d8e955968bcc29869b3694fe797afa8ea89ff3145be204e0011137830	2026-06-18 04:26:02.696
143	32572825b63e047a2813dece5c41538dba6340d75b0d918157f7103a3327f895	2026-06-18 04:59:45.147
144	4871cba2a07a75c31a2d5a757e6e5adf8bee2a37280dc34ca7ad40ddd02ccee3	2026-06-18 05:08:51.784
145	60aede703b5aa15fcf5b78626e9d3c3196df19c72b7ee2f58f5b4bc5911f0e88	2026-06-18 05:09:19.193
146	3988bac19ef41058e670d0fda626909cc9061078cd4cdf4630cd2639857c6417	2026-06-18 05:09:41.374
147	32195737948491afbd664fef1012cf3ebc2416fa063c773fbea250ab24b57253	2026-06-18 05:10:06.082
148	f9542b7b62e79297fa1ad9ab63e34b3bba10341b5306a6b0a2ec2facafb1e253	2026-06-18 05:10:29.256
149	146cc987d0b4160e77785ffcfa4247d6736d2996456587e14ba1d18bb86b03e9	2026-06-18 05:55:18.609
150	671e03974151b064c81c259440727aff4527bd20597c51b40012c456d5fa4e3b	2026-06-18 06:13:42.163
151	e5285a07dd614106a35f4dc60f07edcf296f30ffb4a2485e60ddb72f82c1e2d5	2026-06-18 14:57:33.609
152	52430d3082ca501c75d7d28751a19e5654de0d4e91396b0d9c7c659f1bc69d87	2026-06-18 14:59:14.533
153	9e4a54ce5743cd98c278a46576d5754b4d3f17d85c7241800f886a3fc9dd30ed	2026-06-18 15:00:20.552
154	c339cc9155dc5242774974b34ec6717864c97930f8cf6c7d0bf61138970e265a	2026-06-18 15:19:58.299
155	50a82288ec6555cca501d91528a4a746bbe7f4f9d01556993a53d0fe650b1c88	2026-06-18 15:29:59.396
156	ee42b4ae9689da8f8e4bea79bd791faca7037d6e3ddc57ecb5d328728fc55e49	2026-06-18 15:30:23.409
157	311fbdd342e2f7a434a673e843856f4866cfcb59ffcb730fe2873a681583363b	2026-06-18 15:30:47.301
158	376b9b1f9198862c5ad1e7894188aa46239aa57a40b0ae3ab5c739e74b85c8b9	2026-06-18 15:31:35.445
159	31ce07e1787c0cce3d64611fa463d6efa0783c93e19f2c80a6c88db197958c6f	2026-06-18 15:31:59.917
160	858831130fee225a75ed734dcc71b27a33e37bf6eb150c3b6ee7b07e0b37d0fe	2026-06-18 15:32:25.213
161	7c5231033bab76a416208b32bbacf49da484ada68d001c2401dfff68cb60a3d9	2026-06-18 15:32:49.745
162	f40f20fed79f9c271b98650ba72e1bc177fce3452cf7a8bf689c78b7d5bb6fb9	2026-06-18 15:33:14.995
163	d7c340571e366b977bc5fbe211cbd1fca4ecbea301f5eb29492ff881de4d8b1b	2026-06-18 15:33:39.287
164	edfdb457bb8b6e86056d704d739f8a1ac058e2cdbd6d60c99608a70997e65f63	2026-06-18 15:35:32.666
165	e100c16e2d3e73af21044f2d14b6e24c8647c5c9a745b1d68dc8e856c48e7e86	2026-06-18 16:15:30.825
166	72ae411765e0705c5bad82084e345e2caf1425d455d220ff3848cdc891391695	2026-06-18 18:44:34.901
167	767c28d0b2ce9c16f13d4a5b3c6e4172252032e28b1adf760ed935981c8ade88	2026-06-18 19:13:00.345
168	7b13520709c4e39f79b06998e65228ee11203bfc03370b1d9b42f503ec3ee7f9	2026-06-18 19:13:06.728
169	2fbcab3089b43d1560e5a4008d34a1ab73fa76fa774d991fb6ce6fdd03cbaa1a	2026-06-18 19:13:21.811
170	1274e960b5ced9a1b31029653c389dd1749c6157b222be6c30d370d1b4028180	2026-06-18 19:13:22.196
171	5d22cedde6c98f0bdf09c0d6f0244e2e56af0e041df266af628b570b96704382	2026-06-18 19:13:52.128
172	9b5f5cfb0d2d5f39b4b3419d088775c09ac700fe8435a7a1657aaac082dd410b	2026-06-18 19:14:56.258
173	151f2e41d6f474eefe351667635cf76f51dc783e7c5f0ac47427902025b531df	2026-06-18 19:15:21.826
174	e0bb49273bc04412a1847f8a9c0f2ad401866746998f81dc2750d85f3343676b	2026-06-18 19:45:29.89
175	b7939e51284126e265d0004c3ad3a3c07cb4bf3176675870371b6ccb92337951	2026-06-18 20:29:56.28
176	c874175af7c6da19ee0c62ff48638175cf26bc318c6c06d8a67ecc691caaf51f	2026-06-18 22:13:02.042
177	17099b3fcd2a2b76b3347677f5814c43fa83c2fbe05f772dc4e7dde13f2b0d43	2026-06-18 22:13:03.576
178	2cc53f73f0c4e9ed6501fe11229ca630bb3fe038430b188bf136b9f627bcfbdb	2026-06-18 22:13:24.245
179	2dffd37f849ecd43b84a0f821bc3058e755633d2a88659b1ac2f489a5c548d84	2026-06-18 22:13:25.317
180	219b659cceaa969f833b42013754534d97e9ecd1078884255d446382266fd749	2026-06-18 22:13:50.28
181	0146792fc2f3c97e10598921aed501f9b6e85c0888482ff9f36296fc25db30a6	2026-06-18 22:15:00.549
182	546b03a9dd4312470d4321fbe74ee96b0300411d70fdc1afa1c9bf419fb909fd	2026-06-18 22:15:24.234
183	70f83ec9253dc06a42013ca7c945701d6222585b81f2cba25301df0fcd72256e	2026-06-18 22:15:50.116
184	bd4780bc3a49ee225a7807a71586fc337b6e00beef4d6c3320cebc1ce3d64240	2026-06-18 22:16:14.862
185	c7d8764113c94a190cc897b2d0d12391bbdb672f534d1a011a5f375e6f2445fe	2026-06-18 23:55:43.862
186	0cbcd55aa68d71efb93cdcd65b2d97ccafd431d4d5caf394e106f95f5f4b628f	2026-06-18 23:57:36.73
187	33cd4d13b6956d4222988d31c9003d9e686aac46ccb0155305a16a2209cdae4d	2026-06-19 00:57:33.123
188	f6d58a40f3ae3986553bb61b1cd381f53621542211b5e877d9b8e5a6e5bc2612	2026-06-19 01:06:23.813
189	951d5a04c5dc4820ddca31c4696fde9a9d119ae338cd7dddcf0e0c237d9532fd	2026-06-19 01:47:49.679
190	c68b647b5012dec56b8ff8379ad9c1dc2cebe26665fa5bbed3f6365d522ce2be	2026-06-19 02:01:30.843
191	35d7a07f96ef0aa61eedc583307c651070d25b0399cc632cd15ddbe474155989	2026-06-19 02:07:20.855
192	b9a3e3f388e55ff0aa07f5796a3689300f90279fcc441504a656a177f1f407c7	2026-06-19 02:39:06.37
193	21cdfb53f5fca16d51a5f6415b7af05f20d270104eb27382ff2d334e08378c70	2026-06-19 02:43:15.881
194	a4270feabeedd1f42298fe09579a2e4ce5ebfaa20c7ac2e0e08f2bf627d2be39	2026-06-19 02:51:23.749
195	d1e61e39dc982eb0c0edf1120374defaa85e669b6c1e2d548652698ddacc2be6	2026-06-19 02:52:11.862
196	99fcf783967db6767595bc6ab8b0d0e2903877bd35073ff899769b63f1df887f	2026-06-19 02:53:07.077
197	3dc085b5e5799df2ba7a17e9dade2b8840ddd74a546352a32bace827cd4b3366	2026-06-19 02:56:03.573
198	d44a07e7e939134c4650d108373901ac822777fcd88f2f158b2b84c75f738454	2026-06-19 03:01:28.527
199	88e2fb350b9e1b69127d2743020f40eaf2718adcdea00113b0eb64a7dd2cfc94	2026-06-19 03:10:50.112
200	7213fa09caf0d87ec4310aac3d16e6b57a6f6f7a6321134d618cf88f390829ae	2026-06-19 03:12:05.482
201	479fa147339d0578b13bd95690a948589aebcfa3b9c6d24b5932d0b8eef09eac	2026-06-19 03:32:41.53
202	1687c9dbd03156a584bbcb9080b709baf6a1154f18379ab5e5e3d217e868b426	2026-06-19 03:47:33.172
203	649839df6ef10c47c46d57ae1ec6f2bf9fa0ba41099a2852363296783e0cacf9	2026-06-19 04:01:53.267
204	46f969d315e2126346fc832bd055d63ba5f6bd40365e40fba0883a04c08bae61	2026-06-19 04:08:01.809
205	de3d129975695662ef4759ba2ecfba1d49e6904a739ffabdae91f45ea2b7516f	2026-06-19 04:27:34.881
206	21281e3ba73441b1bff4277fdc2015fd48e03376971bad0a0681004ed99f9a02	2026-06-19 04:37:31.757
207	c61bb41fc629e3a972312f8b3eeaf39ab387cf506ec72d4a17611f034a5a3be8	2026-06-19 04:45:18.919
208	149434fe117162186641ba4d95e0d02302b3f4ad908e6ad8e240f3f714c67160	2026-06-19 05:14:36.069
209	6c7f71554500df8a2e24403d705dd6937de856a008fdb3c6d788fda3af8f39a9	2026-06-19 05:23:46.305
210	62dcffe44598c8c9f78d14ff9e517dc1f2cd444817039f28ec8d2055224398e2	2026-06-19 05:28:07.269
211	67860e7bd605c77c774d8a603a89c45fcd5ca0e114bfdab5fce4fb0a9e0f1bd1	2026-06-19 05:30:27.612
212	e09179acd5174af3587425488d8684da25be2b3b9ec9b22a7a9e19265758b0d5	2026-06-19 05:31:15.853
213	447ff33255c9d667596a4dca0c106a5f8f58c69a270f3b2f4926433cf203d8be	2026-06-19 05:31:40.548
214	743b3191e74c267d2a9db44e20db251878c87bdcf05fc691ab525c19e2de22f5	2026-06-19 05:39:40.604
215	a037f618168e8de93c4036ca3ba6ddbb1aae6fe45147097f896f173aa9296f1e	2026-06-19 07:23:53.867
216	0059cd7faddc242c439f34a063942f492eb00a82a993c38d7e9c862a5a91e66b	2026-06-19 07:54:22.691
217	c41ee0f403a87c25b18ba65a88c555f50a12969845b8567c690d38443b62c055	2026-06-19 14:38:50.992
218	b64575a86271c443d032ca816e9e0b86d6fec7d3e857e960cff83a93ab461793	2026-06-19 14:44:35.844
219	52a6d8e9c5362efe652998c638712f590ddc592044467d9729bfd3964d0ddffa	2026-06-19 14:44:36.232
220	4a49ff0240eab67c083562cda1880fcbf71d7b57cd03176b7e5ae276dd670ca5	2026-06-19 14:45:02.307
221	49f9a5723edf78bfb2ace642dca13a7a796e795e438efb644055e7c30af22881	2026-06-19 14:45:25.183
222	653c25ef5cdcfb60cde15f00cd8a17adc4817999047d8290e173913e6938e41a	2026-06-19 14:46:35.383
223	cf8b80ee25e81ff8c69bac39f41ddd0d3f0290ce7fd01327658173ab74de7f25	2026-06-19 14:47:01.137
224	4a83740ab01543297c7f1c43502561b0783ee8ecab9beed50a4db36af385eb12	2026-06-19 15:16:33.737
225	f7ed883c7e12e0e0f5a3828914bcea470451c6dc2641750d55a11fd2bd7de3c2	2026-06-19 15:35:52.215
226	96fe8321ab3017a76885157d8922e0a4ea486bfa0ed8e7a9fc2bd31a89300b3b	2026-06-19 15:37:24.417
227	b0d92e35f20426e0c837a25ad975ebe129d48dfe40174b9b0730e78968abd90d	2026-06-19 15:57:01.829
228	e096da4e7bc2d42fea9b5fd198470a922340d1f6ed2cbfa6adc4295611449ed4	2026-06-19 15:58:49.941
229	c9e315bce41e6444df54c5a03ff8cf09442c6db85533f5716943d179d0f9b394	2026-06-19 16:39:13.893
230	fa83d41715c36b16d5a20ef5fdb238b4c2c969f13e5b6de38a320078230acd16	2026-06-19 17:58:07.327
231	3102cc9c4f55f17d2510cbe873af1c9940a54c9f1e58710142e65db5daa9f9e2	2026-06-19 19:32:03.507
232	7cf2bfb11563829f01c4629e678cb29e244ea5ea525274f0d7ac8b9f94e5ba5a	2026-06-19 20:39:16.545
233	8cc56634ca7d40b2e2ce24135492c97d7ce3cdfc517d29d9da17e6decf162ec6	2026-06-19 21:08:41.159
234	0882252bcd3092388cc5475b4dab7a295c58caeb94cb50f17f7261c4411d9a2b	2026-06-19 21:09:05.164
235	1ba9d002244066f6c8a203b3da29651702a3a127378d3d23834394c3f605ede9	2026-06-19 21:09:29.685
236	13d6c58b6b148d05d73643f291261d9fd7b58dd2537ff775e08c74f7cfea986a	2026-06-19 21:09:54.233
237	cc633486fa5d19abba0251301f75958bf51df380355f0577c0efaad08f1db55c	2026-06-19 21:10:18.543
238	eafc3c285c63cf9298bc770bbe207dabaefc27d01b957aafab5294b44e8da099	2026-06-19 21:20:51.711
239	40320cfab0409266b5ff5c53a81fb565b2bcfefb0d191be6bbe86a5913bd30ce	2026-06-19 22:26:44.151
240	4a1d6e88b5a59d7c6191a77f66d8a168dece3e40f03d2850977e7a1a06487993	2026-06-19 22:36:53.065
241	6ed89f62830b91cddaae27881eb3746fb6d561253a3d4c71d5b08bc6c46c9500	2026-06-19 22:42:22.481
242	783685792dc02b863cca7867fb256e61355311bfb2bdeeada39b0dbb10938360	2026-06-19 22:53:53.949
243	2de68746f7d2384900a3b93df7a2c5692de57abb3f3bee6fef0c824e3e978ea7	2026-06-19 22:58:20.134
244	2806694e5529e3fe5735169e485ad4939bc78328265be2d8dc3b61c274c3ec90	2026-06-19 23:08:22.259
245	e762808680ed394d56e025a3b42efd868b6d0565f901fa4387842d9299253eb4	2026-06-19 23:09:02.562
246	74093b1a0359f2016e6de9e94f71ef8b69cef6206304e5123beab4daa32eeace	2026-06-19 23:22:57.572
247	93b36ce2d011b5074b78111b33a47b7eee31c7cc1b68cc2ae0d2fcbb3236008a	2026-06-19 23:30:32.544
248	f8a482220e097402251fa284cbd2f0bca435d913ec1544b456116feff48ff506	2026-06-20 01:32:36.259
249	cea5ef75fba017b23d4f31f9372a673765230202de890ddc45d7a92aa37a8861	2026-06-20 02:13:01.886
250	dda682f0ab49c423b2e613493a713ef7c732123047896e88305c67b4fde42851	2026-06-20 02:13:24.938
251	8b7ff5cc76695dbca95cf31323bbfa29e5033b49014b034b4be3c9717ab98724	2026-06-20 02:13:57.738
252	bd338cf119101edeba5a5329d0e27ad82c0638dc30aa2f08f9ebecc31136602a	2026-06-20 02:15:00.476
253	87e2712a570d598d48c0e9665f756d474d4c1965b73eeb30e547d050177f6f66	2026-06-20 02:24:36.487
254	b2dc19c3137a90aaffebf5a7939ae7558d63f8094422698d605c81a3b17676c7	2026-06-20 03:00:56.081
255	458e22b5e974501049b7de6249214df1d95b46d6e31028a073d3030d2974bb53	2026-06-20 03:55:43.171
256	fc73d8bcb14f7849e2c1f60de3d7cd0fbfa62a3966df2c2abec592e8493307cc	2026-06-20 04:00:04.926
257	d1682086120aae56e5e30ae708e6671627d4d67e3e73cb8b0301e33098fb0955	2026-06-20 04:32:07.898
258	774e55348bacab60f70f46fbe677390d32127a12fab83d2468a8aefeb5b42a5f	2026-06-20 04:34:16.057
259	3adb9a6ee2879d7165ea40d90dff5b3dd2f3ff296e90b434d0a0b766a6797c4b	2026-06-20 04:40:04.401
260	11aa51dcff39ce9e84ec2d48d054a3a13521b89facb01b3ba41e227d391cfd20	2026-06-20 04:55:00.112
261	777c1f06441cc3c53c3a69201b023be022e15ce510156318db3e0e41b57f43e2	2026-06-20 06:06:50.967
262	1189c8b655b368a0056e8fe20418dfc8d4d0e60cf216dc733287adb847fa6823	2026-06-20 07:16:22.687
263	6663f905fb799ada5d9772bfd5935a109df1d5f10e8f07030bcf9062ecaabe45	2026-06-20 07:16:23.691
264	4d3728610e34cf12462c3a7f4a6eeb06133a5365ecd0332125b60c9335e0c2ed	2026-06-20 07:16:48.707
265	1eb2c4e8aee884f6b974a037e6396e871a194fccfcac898e9862979fb598806c	2026-06-20 07:17:58.648
266	a02424b87434ad57d57f0260b0c05b8e47386cc51eb6fdacb31908a5121653ac	2026-06-20 11:30:02.619
267	8d441c65ac8fd2e746a177acfe8107e6bedd523de47abaf51ba6e97736792cd9	2026-06-20 11:34:58.386
268	b2d8af024466d95427f8ad142928c12c7e2a72ba811cadcd0e45ca936e48f04c	2026-06-20 12:32:22.274
269	18692613c7209c1876a12b0db1bc02c000583c18cf8aa3efb57477525e40c555	2026-06-20 14:05:05.316
270	08121c8ceb0d28abada379e0c6dade269ce6a21f8e6d5d9f69c7b6fc25b075fb	2026-06-20 15:10:55.238
271	6ecdee06c84676157b85323215d8d0e18f38e5f5d34e02b35096afbeb76a2870	2026-06-20 15:28:45.695
272	dc82128aae9ae5064245457cc1e06ed450fc5f1b75e695c5e7e99cd6df9ae54f	2026-06-20 15:29:08.54
273	c84ba6986673c6fa83b8993059d450426718342ba44f9182542c65a1acc60bb9	2026-06-20 15:29:32.411
274	407c77f0fc4f55fe3629aac35163ed37e2920494dd0f4efd8342ae9c417a1c20	2026-06-20 15:29:57.621
275	35e1fb8b1543c9d8755ccd6db843d451f2fac2a18d9f8d85966878f6caa716f6	2026-06-20 15:30:23.302
276	69bda363fc87293493932935de12c5f96c795a6964938b2e86381ede341a5264	2026-06-20 15:30:46.35
277	48191d1b15e496bbe36e55a4ec6298e6b44e19067032195cc2da0952c44f3eaf	2026-06-20 15:31:09.718
278	2b5dcca5978436257719e5d5c409d2891a75eb2fba673513c911a59e6fdd9f5a	2026-06-20 15:55:42.583
279	70a7701744df961a52ab2e9e5d4faa516b6c2c9bea341370d738b09d57104906	2026-06-20 16:03:57.408
280	6c5b7dde3b953e2679ce83e6c0509d452620126308d4ec43bd75a69e938c5872	2026-06-20 18:45:08.133
281	87c59d6599bbcee0571696cb0d97c0df7ada86665284113cf288430a1dd55b27	2026-06-20 19:17:28.549
282	9c04b0af118cd82a071d06899ed248e9c9c98ead2dfbd4e2bd44b17affe8669b	2026-06-20 20:28:17.366
283	bd740736ce231e5219a857b7cee5d482181e23c1d896cfb9a69342a2070c691f	2026-06-20 21:10:54.758
284	2d6a52d3a9766b77edda1e1960a2b0c5e2f967d4c1e3f3df1587f6008754e827	2026-06-20 21:10:56.971
285	8e1fa0abf96d8fd7146911139337c8dac698b911f03b3bfd05736d20de2cc2f3	2026-06-20 21:11:21.42
286	73faf9984364e6b9d721cec648930d919f1d2aee50075a2770d7401be08147bc	2026-06-20 21:11:21.442
287	01937ad991b8cc62bb0b5625885c48d65fc6a2c0a815c3943c301399062a96b2	2026-06-20 21:11:44.375
288	63f44bce5e3886d4a80e490b4eede52f6fc456003ba1bb6b81ca4c5a527fa37c	2026-06-20 21:24:28.022
289	6557f173a26acb785dbd968206eb66e1218fef0211edd89d8101e74b6027fa4d	2026-06-20 22:19:46.069
290	4686bf708baf2408977240e04bab05c8868613a6f47872872947355a77709808	2026-06-20 22:24:55.027
291	66432c6384885e411697484efc853ddf6eb65521925c729840f083e920136def	2026-06-20 22:44:06.368
292	ac0bad269b2977869a7c9ce377a17abe5a3c807b7072cf2034a3f571d893a67b	2026-06-20 23:10:15.747
293	3709b55b6607c34994f5cf72fd2ee04c18006ab4af6ec451fe601584327a259f	2026-06-20 23:14:10.597
294	ec122a16e6da6551340718687868d74ae7f93c5637140cdcc00cb598ffc361e4	2026-06-21 00:11:16.983
295	cc45e17e06d4321548c437aa7b0915beb01f4e3666809e6203cc756d9f5059ba	2026-06-21 00:12:02.479
296	835e35fcbeb1b9df35b0c1182d77f306a328b6a42d3b65edf052cd3c84cc9e98	2026-06-21 00:17:16.115
297	b3da1194cd3885e5a2c61bb1bf20fcb5473c56b7a8e60d4f712122f194307700	2026-06-21 00:32:37.883
298	1aa3316d6681acbffca79f8b9b193f5897efb77778e9579dccdedec68662ff81	2026-06-21 01:05:31.456
299	198ba9f9749703df7d8f6af839c5da942aed60bb7bb2f9566ce63d644c2f48c5	2026-06-21 02:01:30.684
300	f14522264a5ea7db7d9cf17d1ce64d6227a3a01ffa871d52540289332afb981f	2026-06-21 02:17:06.359
301	61fc6dc796ad64267bdedd83bc844a84e9ccaba26b1aac2060bda3150eeaf576	2026-06-21 02:20:17.467
302	a775f8ab2bb061ac0323b499945a71bf1dd91f22bd8e50de1851514b038b1823	2026-06-21 04:24:08.483
303	deb523ef5517c74177202871e5a1dfbcb8488a6d0ee0d013b9133623c0b51faa	2026-06-21 04:32:59.105
304	a951b87480c729920d6dd9eaa5433e981472c6eb87dcc2637c3122582f5db637	2026-06-21 04:33:21.181
305	0a7ee3e8a49cd1e73bb041db54700a1ab1a32d0de77e56762cdc5a4ffd8a494c	2026-06-21 04:33:46.078
306	1d465cac1459fb132f66704a3bc29394bc4c7bf9afd21188d533afa3949e6098	2026-06-21 04:34:11.498
307	a972f515f2766c4da7778f85a6d6d9d3bc733ec62ee24a3378a0a9b8d29bada3	2026-06-21 04:34:33.932
308	a5a63606a6616f920548007effedee3bbedb900adab7cbecf6f23261afe72dba	2026-06-21 05:42:04.5
309	9b318a19f4192976e29c90f1bb5c49c6ffe11fef441ed965f92f1345426908aa	2026-06-21 06:37:32.495
310	83ec118bc3f39757c422a01438ed1498f2bfb6dde9c076b36f24adb8b0cbccd5	2026-06-21 07:01:42.596
311	43db7766fab84bb9ecabacd80cd54d7cd70f07f8966f2f2f3778c88a37e48520	2026-06-21 07:24:02.967
312	a776b15e2c4421340d9c718cf1f1dd46c6e92787bb49cc0efb8da08413418c9b	2026-06-21 08:23:19.239
313	17caeaaf559753a1a639a3d0a142d6737403184f59ce1042407f8646e0c4a05d	2026-06-21 08:47:47.092
314	4174508cb1490080a7bf950e6f585705619f498de7da33cf203bc02957eeef54	2026-06-21 09:47:28.778
315	2898ff8ede60f28f353d75d6bc8e77b4a4471acede2d26de54fde8ea444ba422	2026-06-21 11:17:48.223
316	615e85a6d90de45909d11d11f5d29512362d8931eba031fa737bb54ac6e63e33	2026-06-21 13:05:38.569
317	a4c43bce84592b09151f2caeefbcc47779543fe572ceccd159b1f875b1d0fbc6	2026-06-21 13:17:09.123
318	ac77e27b32b920bb4378573ff68172860c0f5a98a4b97e72d63977b4b5774e8a	2026-06-21 14:56:12.889
319	0ff8e9170022d69b0afbd41fe8a3dde55d43c2b57e24fba075971c51dc39f26b	2026-06-21 15:00:23.386
320	acf3fac3d8d2ceb6f2d714c1357cea15e692ab596187bf5660b409718aacf3c9	2026-06-21 21:24:38.042
321	f1457e4b7ea90457766ad53cf76e5bff21d54fc25b387761699565991fe26a85	2026-06-21 21:25:01.497
322	6c91263b256ff1b3a07b8ce834c514402538f3fac9b63f1e026602916583349a	2026-06-21 21:25:24.857
323	1e3cd3a82183acc6a08bf826e4fc85b5a3901018171fa61174af8830d593b26a	2026-06-21 21:25:49.304
324	5e6bd495d6d917b87837e221c9aad15fd4ca258438734aa3383fe0167a8d4177	2026-06-21 21:26:15.402
325	97d9db7590e4728ce78caeb25ad20c3200f03c81d4140819ac89ce1d384f33b2	2026-06-21 21:27:03.372
326	f4420a36850f57757332cb32b489e9cba3727002b6d606a6ea7ed4e82d5aa1e3	2026-06-22 01:48:06.077
327	3fc17e24a572944abbe484f244f933d769da100e4f21b35fbdcf43fc491f5f20	2026-06-22 01:48:30.924
328	66606e61345bd8d05733cb6cc358ff8f5d09b485f69875e3a44fae7b5819fdd3	2026-06-22 01:48:56.097
329	69f2ca8e8c3ca76933cda2718a22ee5021c6589f40932b7223a723fa94d135e5	2026-06-22 01:49:55.381
330	de1575ee3c17d1e2d8039ea6f34289c8109b638fa9525b45ad076dc019e674f2	2026-06-22 01:50:10.257
331	6634168d5efcbaf9fe10aa5dc7159aae759f16b9316c5bf9c41dd58268609c3b	2026-06-22 01:52:08.606
332	0155a1bbf73e30d2d43a83c5ef8644b46216231b35e29561eea4282cc4a0f35d	2026-06-22 03:11:35.561
333	ed5509567d170b7f70fc8145c7f64be7eae8896c2f7b7cb17127edf8ec79f490	2026-06-22 05:02:16.498
334	4b81929ecd23fe6bb0452a41ddad22b6896cb7fa317c2fac94128e390221dd7f	2026-06-22 05:02:40.38
335	81c7014f076c50155cad9840c4032e6f5c843e8a58d181ecc5506680a6e24fa1	2026-06-22 05:03:06.67
336	5861692b29ee1f6001c436ac48958d5d38242da069d1af6e37200b464e7e767b	2026-06-22 05:03:30.212
337	f16f772c701a1b1b45805bfa3b92b8b7f59d674bcc0e446b96497f057fe80b47	2026-06-22 05:03:58.23
338	710d3fd654547f6d42f81ce8d2750eabf891535f036826c94d02ffb9b1817ea5	2026-06-22 06:39:53.849
339	d5ba9d7a0631b79efba9b6a14a3dcd57f542551d68b50a7bfbd0a863f1310b95	2026-06-22 08:16:42.628
340	d48a5431758ce506b3b8b23a76bf180849dd46baea7f1170b46fceb0f93cddbd	2026-06-22 08:25:23.261
341	66d25587c673e6bb5547217772448fc48f2b3e1becce164ccbc22c36c2b2291a	2026-06-22 08:25:50.53
342	5241a18d385c8fbe874060e2f41cf8f7880491fd4437252ed0ccbac02ae0d9cb	2026-06-22 08:26:11.569
343	f5f4309669779038425f52a21d01267698f4ddc26a07eb57a0772fd158fa8df7	2026-06-22 08:26:36.161
344	871e3673c5049e28e07cece9867479719a830ddf7d2fa9becca1e72d184eabba	2026-06-22 08:27:01.622
345	a2cb7dd1167e2adf2ecb3cccd9811a6c76e48f8b8e1e07ba8778c2fa939abc11	2026-06-22 08:58:04.171
346	a4eb436e7b36e27d26f26194aede92a82d842d32e36abf423e3e2eb846941827	2026-06-22 08:58:56.456
347	5213b3ff26d1e5ba5b688bd229d640f09ac71e4d939adf3ad4a5d4478401f494	2026-06-22 09:34:23.287
348	f57565beedec304be339f4d9b4af9a6857bdcab58bc42877e7407aef61a416bd	2026-06-22 10:25:06.11
349	fd1c97724e604da8395e5762888448d03b363ed259cb6c1ea392ff72fdae1fca	2026-06-22 10:39:56.313
350	24f25b13fb6de6327b36050fcd3640f07e2ea105534793a576c73950670c2e15	2026-06-22 11:00:43.659
351	1ecd0cdb81c7b1534fc6d22e4f7bd4a834310d7fc156cebbd6b585a62fb7cc34	2026-06-22 11:32:57.803
352	e61b9c3a13d731430ef8f1da14e7482355eae115f9ff3b7ffd8611edd60678d2	2026-06-22 13:35:36.494
353	4b35e2e772804a0fc1851e88b867066fc6c54fcde484fe10997cd7aa895634e4	2026-06-22 13:36:02.522
354	9946ec1c2a98ee21b50549a2f30f89da859206b3d464ecf5610cdf36d1000071	2026-06-22 14:59:59.94
355	0b92ef73692cf25d120997195d3faaf078fc5c71f86c8ce1702100ac0787d833	2026-06-22 16:57:07.988
356	aa3c56af5ef18247fad864ee866ac978b2b9b782dfcf6494261559dfc167d2de	2026-06-22 17:09:49.571
357	a71ab7c7c69bbe11ac7d758cfeeea7c8551c072df33be22b205e1d3a8f24b395	2026-06-22 17:44:51.587
358	e2d8c218e6b1dcd188db2908d43bd31d52ca04ccacf01dec3db0d18f589c2f34	2026-06-22 19:28:36.298
359	7025b768e0d286906f9ef7c0a94f17c9790e18de5d5d4b106c55ae1b3d3c826d	2026-06-22 22:03:25.609
360	08dbcce65705d8c1e54a88db75a4c8ad4c46e5955468e524391b72401ac2fa4c	2026-06-22 22:03:48.747
361	234e6847a1857fe21869a99328730ce6fecdf0f396899c3442eccff8836a2937	2026-06-22 22:12:32.989
362	eb1429657d2225f3f7337bf751cfca268cd76231f4b62d7e0fb22a9b522828d7	2026-06-22 22:12:36.147
363	9c571806d620b98a6c670d393af7a2c8dbb4797d27383ff810b735e9066f60a8	2026-06-22 22:12:44.997
364	7c74605ede9f621d210239f3d3fe2bbe8407ea458ba38272cb06bb8875c8b4ef	2026-06-22 22:12:45.133
365	86629199ca6af19739c4c06bebc8084120bc50eac8d48459be9890903990f0df	2026-06-22 22:12:49.873
366	6c8271d88fa6ba06ba27158004dd526199de7264e096df462366da60e64d4bfb	2026-06-22 23:54:28.819
367	743afbd91e8dd753cf49f52b6512852c0840b6fb08030fa94c9d36f59b360552	2026-06-23 01:31:19.602
368	7f0b2ee7921fd0ecd3f6d5fb5eff1e405d05cad21d71a0085ffc952897f9f3a2	2026-06-23 02:25:17.128
369	aed7bed0f265d24bc397622c1f637ed27543e744212d4f53fa3ce0351fc0f9bc	2026-06-23 02:52:29.767
370	5b87b1eba69c404401faa7a4ea16390e7de6204509673d3af8dbb7ba94ad4446	2026-06-23 03:02:01.981
371	02e6fb39671b53e86dbf135ea492e5cd92507704ca4356f037b8db6b013d2d91	2026-06-23 03:57:41.778
372	a48f3502a936a0c40f812b039fdd3cf2d59c7bf227e37a5562fec45f74a3fa63	2026-06-23 06:02:45.29
373	9ecef0be41a16ac652ab24750ed1be3fd2a6e3ec2f13d1ec82c5b41f60770863	2026-06-23 06:08:59.786
374	443bcdcc7be98bd1201afb3ae9982d48a89f8a22348daf39b642cc59117e0ca2	2026-06-23 06:09:01.831
375	6721fe1eab34352053b52f2f93fe7a7bfc82dd6a110d9781390c264dbfe839d3	2026-06-23 06:24:17.994
376	3e48ef9d22e096da6838540fb846999890462c8a32730a4f7a5eaee6945315f7	2026-07-06 11:03:11.076
377	807daae6166e349a131b06bd62c1ce269a26bd2c92f9f42a2927322f01b1c5be	2026-07-12 10:27:00.689
378	c926b8c5992a93faf70d1726b8274b3a59ca13e8d7dbc7738d417ab428c55af3	2026-07-12 11:03:15.295
379	c17a882db6eb217a551bb91a2b1f3a9fb0a97dc66a18fb0d83542e39b9ed423a	2026-07-12 12:07:01.815
380	d1c023827c1ce3d77e0c475dc0721712e25a7cd0d7f40ec89bc23844d0f59113	2026-07-12 12:25:46.431
381	05a898547e57400020939f3ff1ae0461975598fa0a8bf4735415541cb475f8ba	2026-07-12 13:10:09.895
382	a09694f11e9d6f7f18439c2414f764ed07b71b4d067541fc2b5173f8949feb7a	2026-07-12 13:11:49.474
383	38ff88b96e69b2bc354bfa6d5adbda5f8145b4fb6ccea13c5982d7e9286dad3a	2026-07-12 13:22:37.107
384	6d30b4f7034e75d95a6c2b198cb1de9072317b60ac0b866c900e481867f0f8d5	2026-07-12 13:23:17.013
385	9125fcf82339a952500cb69d655c4944a17bba3e140bb60344bd9ea4fddb0499	2026-07-12 14:33:29.098
386	b547c1d16e00ecd8d57f3055528b5179d03f2b6f78080ee689b03792861d8540	2026-07-12 14:37:30.482
387	64b96350b26058027e90226ee8aeb5094c884f25d66e1ef1c2e4ed7b89e70de3	2026-07-12 14:45:31.501
388	af09d07877bab836dd8e020744c9ca74f2e14bf647d37b0bb7f17f78f6dc4a0b	2026-07-12 15:40:18.198
389	7a257734a7d80dc3c8a25630c68f2588cbe9d2a52a42f35b9a1ad6eeedd153a9	2026-07-12 17:03:09.61
390	fb2ed4bd079771cd0c68bbaf9643d3d7ac38f61073a64627a12b4d02fc8fab5f	2026-07-12 20:05:46.427
391	86ea56a3d9240cf9b17306bb98483dcc335285fdc7ac15fed020b50d9bed6ec1	2026-07-12 21:57:20.043
392	82285c1b04d14959292827d329dd3a3eaa613f43185fcc9f6cd05f69e05c39eb	2026-07-12 22:54:20.765
393	3240d7e94d474e19b24c8e1a0af8df3bc1e511bd3f1a47cf6d18730b9b8579c8	2026-07-12 22:54:50.346
394	4ea30001af9f030e56e8a6ee3dc3e3cac12c3f27da4b293e458ec676b1a06c48	2026-07-12 22:57:13.534
395	429fb17ad351fd367b9ca126eb3c90b5c9ffa116deec635470e2990758652939	2026-07-12 22:57:23.835
396	567c4e3e92a5b5fd478ceeac42c0c2c9544aa960dcb99a4175bc0bb1ec582ab4	2026-07-12 22:58:26.267
397	4f7eb50649e2ea241e2ae977792e3a3cb00028fc01c491ee30181a33ed913eee	2026-07-12 23:08:43.673
398	f6f27587588c38141cd2745af877180fa724c5c9b0f64f4ce8ad6f1ed6e375f6	2026-07-12 23:29:59.32
399	016b4770232b7a50ecf42d3136138afe4ea9d557d9519ad2d34364b83c4cbeb5	2026-07-13 00:12:34.005
400	49a1a448fdf56bddaeba6da9b1cf53c96a9c8d819ff4f34c585b4b724ffff20d	2026-07-13 00:44:45.044
401	c4ec40ae452752728bb099008406abb47fdc9ac2ac6ef86f8440bea7cadaea0f	2026-07-13 01:08:42.991
402	1865f212c0e9bdbacd54aed51d3e64c2a6fbd61de2d3bacaee6a05de426809d6	2026-07-13 01:17:35.866
403	851bdc08cbc661d8abe0d149f049e7c2ec0e98c5237b7f89ebadc414193f46be	2026-07-13 01:35:31.709
404	855a4c17dbab664bcc2961de3de09d761d892d2534b4386d89ceabf0c09859ab	2026-07-13 02:23:12.187
405	80bc1f3cef861cf4061427dc91f515a1eba0c4cb40f7fc0c2c16182a54be9157	2026-07-13 02:24:29.014
406	97c1ad2f2f08d41e38ea721548621cad10e609a668943793c640dde46d84a9f7	2026-07-13 02:48:53.544
407	6ed0e6745c49ce05f5ffc23f9a5b44d6274361517be81985b7633c77c6db4a2d	2026-07-13 03:23:00.807
408	8cd8eaf4b96a7cd2c7a174b70fc666e30a279e7ea6338d7bda06d23835581fbf	2026-07-13 03:39:41.528
409	4509a96dc58b31e3180d5203c43e05277a1748800cfb44689c8c1f800401f5fd	2026-07-13 03:43:38.753
410	82e8e41f13e0668c7eaf4dc7ca6013014ee47657412e00abd8c1d0c7c826f73f	2026-07-13 07:51:29.56
411	20bc45adeb90903de4a26fbb1ce2632f443e96800385482a036798b96379d720	2026-07-13 08:23:20.466
412	34aa3904601ba2613b37fbb637717d2c8fbcd39c1d1293b8288ca8fc53f22385	2026-07-13 09:07:34.848
413	ee150ea3056426a11f03f0859c51c23c584609e09587a99fc691683f976dba1a	2026-07-13 10:02:09.031
414	7b49e2540d7c4839d3f331611c8ae3b649ea7548b3c1154d26ba38943a681caa	2026-07-13 14:52:33.223
415	d72e8c8f5737603f6119c3eee50f97313654e4f8e516dba4411e9b1a20db3f1f	2026-07-13 15:25:47.059
416	92e4eff3a4e79259748acf032e049b27d33142a1d6cc6c67316c578e25411ecc	2026-07-13 16:14:13.621
417	222666f718b2dcdddb0134ffa59ea640debddea9a756fab900ec6b3a6b165382	2026-07-13 17:41:42.406
418	a662ed5997ff67135bc95e78b31d2650703cf04185327c12cfedee1007bf84bf	2026-07-13 20:56:42.958
419	a9205486f00be7e95d09b7299f86a963d8c1273139c9035de34af6595ff800b1	2026-07-13 20:56:43.911
420	a9b32423b26d51fe1ad459ec0dd59b4489c06e2a861839fe4f81f40c9f791d01	2026-07-14 00:46:38.125
421	a29a4f9389a75aec75d3a286017dda4dbed83750c99db31dcbe207d066117d47	2026-07-14 06:49:32.723
422	6562901a0b46a028980fe3f77c98bec74ee4c8d47c193d0dbfff5022a7c82924	2026-07-14 06:53:23.642
423	1454ea9ac7bf6fc25d193802c866063c143e8721ea2ca008a2ae2c11036fa901	2026-07-14 07:18:27.4
424	abaf6e18f1290e8d10463cec11235f1e353c18578ec7195dc301c4d967472b40	2026-07-14 07:46:09.333
425	ec31dafc361be6b11ee9207d6e384662ce3faaf4061b6bb6682a4475347a4d5f	2026-07-14 08:05:26.548
426	b8dd95ee94a66dd480ac78f41f34d01e1868af23231258ef88e0e036911e4d7f	2026-07-14 11:28:15.582
427	3528c1427226ae7a74f08e806e00563acf738ee5ed247c492a33dfd46fef6959	2026-07-14 13:37:13.973
428	8d3c5c47eeaac6f6cace336784aadf0e440509f10c14c53a322cc3cfc9f4e6ac	2026-07-14 16:07:38.808
429	2aafb9477c73c482e1e8053ff7a00330e79597c9aa780ef658911e01e89dcd04	2026-07-14 16:17:14.412
430	48f784ae4ebf1b08f245c2418b1deab179f82c1aed6ecf2bc695be4f374ddc3f	2026-07-14 16:46:23.811
431	3a470c687ab3a3e112ca5ed8dc234bdfa8ad0e283e9cf5efb63b569a96867b58	2026-07-14 19:06:29.548
432	5f61b4c7a838b162b10fa5c8e80239cb4aebb1db75c679dc3f09a1871a6da075	2026-07-14 19:21:43.274
433	1d683395a12b937c707c15a095a73adfe2f41ee3d2d8799b20191c779bbf3937	2026-07-14 19:36:16.154
434	6c5dc79bad7bea8a5306c42cda58aac710d64d98e5281241a80917ee7b2150b7	2026-07-14 23:03:40.951
435	b87c8b2c3ca3ac0e86decd0145baac6dda7e1884e281770d3d80f3baded09207	2026-07-15 03:47:10.167
436	9674b812e0556e63b85ed8c5120b57794670107e28d0cf46d6cac0c924fe03a8	2026-07-15 03:47:16.837
437	eb71d4a6f9a3346adfb91abfd0dcac7ebf9b81bc7541c0d13a4485ba5a321eda	2026-07-15 03:50:51.775
438	348d721b6315173be42b0e31161fb9afbf15295790bad3dc1125cb21312e6ee8	2026-07-15 04:28:58.131
439	a9f93f65597a2c92395e655fc7eb095271bff6c9d300c8cf7b9fd6a8f33a5d30	2026-07-15 05:22:05.63
440	dcbe92619af1ea952fe670298666fdee0438562d12ce3f8cbdc159585aad175c	2026-07-15 06:01:29.576
441	ff7c8743f929bb523ac25a5d8c8ef0852190c026c796b055648ce1efa2c71daa	2026-07-15 07:24:08.476
442	a15532a05034e6e8e731772878498de19c30676f0f8acb25d058868c7580fc8f	2026-07-15 09:29:55.675
443	5e9c03c5269631caa4c4157d647ad72818290317cebb61f51237b8fe8f92a675	2026-07-15 13:06:13.307
444	9fd1e1da6ffb8e6cb58b0f9bb91a63e5d3e10ffb2a790548b4ff72bd19ff5fc3	2026-07-15 15:44:06.644
445	8f97d363c80bc390087577f0fc9e4554ddcdf62b826b7d4af55a4ccc2c8c0b6f	2026-07-15 18:33:10.864
446	22a6d91ce449d144b88562dcf7441655a5c1e008efe3fd2aa87fed5569352de9	2026-07-15 19:58:32.662
447	f5afd7f8bd3389c395e1142c8b2e251b449fdc8cfa6b3c4e66027d5a9efb75a3	2026-07-15 21:08:41.248
448	3dccdd7c7bbcda2a1a5ef7583e29cee754e058903048ec8830b7fa45ed219d79	2026-07-15 21:09:50.13
449	11089a7c718f6f997a9584d3a43eeff59e2cbfad60033a6cb6dd88ade8b46085	2026-07-15 21:10:40.211
450	ae35c054ccb01cd3a3478079ab4f916afcda8c77fa1f26b6e592571a73c73a8f	2026-07-15 21:48:23.808
451	e62ba9826b85ce7e457e7ea62010958dbdd4fd62b14e3a9a23b10732a9f90897	2026-07-15 21:48:49.675
452	32938fc932829b28bb10a52f4bd6d65f72066a5f20eb64df71fd1eb4538acfab	2026-07-15 21:49:12.108
453	b041c0eccbd7e3ecb90624b0357c39206146d2f584bcc5e9704397ffb259cd3e	2026-07-15 21:49:37.287
454	946607fa62d5b756509eedb29f22955afeb2d6e74dcb6e906d15a731fa9baaba	2026-07-15 21:50:01.079
455	86a0877a1b275e88c0ed6bc1de0ddc368d7ffe48dca083bf93fb757130926e66	2026-07-15 21:50:26.71
456	ae6fb3083becc4d1eb0970c9669c12d3e66723519db7aa58f63a05114a7ff9a6	2026-07-15 21:50:50.771
457	60f3b8dc559704e821cc3744e14a00b623e52005541f9341a93c020439de7028	2026-07-15 21:51:15.877
458	d8d4c225bc66c90b0e4028e0ba5fe68b294058acc976c7850cb2b2d10ee7dd09	2026-07-15 21:53:51.529
459	ae09cc52fca143f2c1b22d778bc2131921bfb8657855af8bb315ede634e61098	2026-07-15 22:41:59.08
460	778cb3e33d9e6eb4c98794c43c2d84d09dba3d79fd1e28dc947e68090a223daa	2026-07-15 23:33:10.566
461	0396c0df58c2168ce083d5c1462c36ada83f4bd49a2a4337cff508accbdc051d	2026-07-16 00:33:42.683
462	e7cf691aff63cc2955f7f57918958866428522a265d031d29f94fb48ef728be1	2026-07-16 01:10:36.028
463	a4cb57fc3af6f2be0bfbd41636ff9ca10bb684affcf3b35e4a4ccf669b621a0e	2026-07-16 01:11:25.442
464	2ce4ef3cacef0c0fffdf2888a6419da993777c5163519fca1ebafc9bf7d29016	2026-07-16 01:11:50.312
465	ed7c488f3fe9f6bdf0b6d62cad5d9cfd54677681ceabe077108a5215b7f64ae1	2026-07-16 01:38:27.043
466	b05222691d4499d8088c8c0312379aa98b434fa93f7f227841fffc16b226aa69	2026-07-16 02:15:55.69
467	c70b66cf7e57a71aca42040b0ba90489048b77fdc8f678c3abf6c6f0c13dd434	2026-07-16 03:29:26.807
468	0176c025e28b2f92c11ee8900ca0ea8cc446000f2d8bc2d18bea0a91033b5174	2026-07-16 03:38:27.222
469	eb1deaad0bffe4a7f71ab1553e0309bda2f844e06a0cae31087289afffb81422	2026-07-16 03:38:51.938
470	ec155c93911b6cddd7a28e50d0a6167e2a449307ecf2b18adead2ed3bce96629	2026-07-16 03:39:39.579
471	436119fa0ad56477db34368d29d4b05b21180bfa77ecad5e8ca4298830042a49	2026-07-16 03:40:05.088
472	0d972742692c6970881c8ecaef10a337999c0f9b85cac6bb1a85b984b5cac693	2026-07-16 03:40:55.581
473	82619eacb2f22f72d85869c9bcbe5e1d53ce4bc1b7d465f00a7a2ffd6f090a82	2026-07-16 05:14:51.995
474	09b96d41d177c3fe0e5f4650736be4dc397f56ede216be574d927768f7088c56	2026-07-16 05:44:55.917
475	ee01da3e746c95174dab326262167a1af2aaa768aced1be2c29f22db13a6d010	2026-07-16 05:45:26.764
476	9756e4fa189257c079d457239a0d7bb6bf7dbd8a8792538dfe5af90cc99404b4	2026-07-16 05:45:38.565
477	57c0145207e1d0fa2e6b293d608e3b7cd2d008b73b27c44ca3f17d7b66edf66f	2026-07-16 05:45:44.435
478	1b2fa8c76429def1589467de4669d2a65a9df35c491f44871f41412c5deab9fa	2026-07-16 05:47:19.506
479	ac2f7ae40a284dff014b7ed371d3312c6eeef4bad54bd6e0217267c26c9eff63	2026-07-16 05:47:44.161
480	dcc0a38192f610fd4e4fc8e8bcce70634a0734bc5bd79f457ed64016ab287af7	2026-07-16 05:48:33.401
481	840d76a574c19ab88f50c2cc29440b38268d27a786f805a22724be802f0a0b0f	2026-07-16 07:50:54.202
482	046eca50cacfb5c903aef216b877b0b2751a84f99b396e4a8074c730598248ca	2026-07-16 08:09:38.354
483	458fd312d6297e7a8c4496259e664bb7be9940461e3936b4e4b0e42ef9d7503e	2026-07-16 08:10:20.667
484	43c8bc82ab6c5d695ba8c013965a07ac0a66e62427584561f6cede46d6b2eade	2026-07-16 08:10:51.396
485	0411d99aef9e7781063667c477819c91d60c68d377d1d54c66afb72c0d17deae	2026-07-16 08:58:09.256
486	8ee0144898f834b6ee248706b6511faa30bc39e74cd1e7d3fdba9ee489d0b0c8	2026-07-16 08:59:47.583
487	5532f3644823a57b1bbb3125fcad48330350f895385087d95c2265d12a588dbf	2026-07-16 09:00:25.081
488	182f7a87a49fbaaeae18b61e761df99721d7928bdc305202f11b4645887186d2	2026-07-16 10:07:08.424
489	badfbdc0d2d6257ecbdb2cfe2f94a35a23fb82626ec481eef9bb4726e8d884bc	2026-07-16 12:28:20.381
490	237f361aaa790b903708819ef824175de1db9ba305625121e32d59129b2c7468	2026-07-16 12:28:43.974
491	d2db94af6526ffaf252a9c88ee632feb49ab286fcbd093c488ec007cb89657db	2026-07-16 12:29:10.963
492	d4f01ff27f3f2dbf33f4d0bf2c2dbfb2898baa66c0853f1653ed8f7a55a6eca3	2026-07-16 12:29:33.383
493	d698df29e1c457c2cb8be07d1d4b3efb3c32385235ae6e3106f06b35070b24a3	2026-07-16 12:30:02.341
494	0fb2a0e8e10f9e8f214c9ac613a81fdee13c0ce4650294a9ec9905b806e97632	2026-07-16 12:57:05.178
495	185065944848f73594c7b3e9ef538c9f366ef3036ed9b8c0c4bb04b3fcaa4227	2026-07-16 14:44:57.923
496	3f5baa181e0dc6045accc00746f285c11125fa30cb726d3567000b6bbde71489	2026-07-16 14:45:24.812
497	849b2038d6a7656cc4ca7773f6abaaa47c0b322f4a926e0fd8ae02eab3986b36	2026-07-16 14:45:48.745
498	9b578b79afc0d9a1575f3489fe2225a47ec98853925ca1f75f1c71eb30f5211f	2026-07-16 14:46:12.767
499	b1ca811b4a1244abf17e4de31922bcb2508d2382a8d374888167aa2134f6eb9f	2026-07-16 14:46:38.446
500	0ba0b2022acc9f6805f1d14a69324697d89192a75f0e87ae2ce3c97236e94d03	2026-07-16 14:47:01.482
501	b7b96826dbd8e52d68cb30600b7565a1d1ecb28486cd1a0aed8e4a298805192e	2026-07-16 14:50:15.385
502	cb5f05886b17668e6ac916c8a92b42d2fc3024a1c6cc8378819063b1976d1500	2026-07-16 14:50:39.103
503	8c6d6f41b08549a1d12d6f1bfb90efae75c7281b06be38637da71dd6585aefbc	2026-07-16 14:51:29.428
504	1b1ad66ab015ad1fb7686e4dfbda7adc4b673d171995afb45e616340e86fbeb8	2026-07-16 14:51:52.351
505	a0494a397187de81fe3a4cc5fc2a8607e413ab6b31d3fd3a179f4ee1cb6013ec	2026-07-16 14:52:18.075
506	244c3eac5aba28272f2d0b65390385d9843068bd5613b02a44297ff69c51e44c	2026-07-16 16:00:57.697
507	0aaffdeecc0cf467cd3636582e3e660bfab71c9f39e2923faaf81a6f5ef2685b	2026-07-16 18:56:08.331
508	3a5150def8438d08200499ce0d8d229e1fab3c65540248c121a9a02ae407fda9	2026-07-16 23:34:05.767
509	4e172ba9a21a447f27e454491064cea4a43c59e2d70e851bc95d4353ba08fc5a	2026-07-17 01:26:16.748
510	3e3cc9bade78c41b9031e376ee6d96f9607edf538716e0f465471760ac7c88ec	2026-07-17 03:56:53.135
511	e1f27c45e2c8ab0beb655aa6bd4cf2944a0df3ad4aa2ed53bef55dcdf0f42fdd	2026-07-17 05:39:51.057
512	ed6860feffdfdacc3d86a536c57354b494a641bb44fa5f37fe5ed07232bb598a	2026-07-17 05:58:58.728
513	8bc89fa27d5728151222517f417dec668daea7a89a94a22cf68277a8d4449d1c	2026-07-17 07:41:06.827
514	ef0aaf09ad4d8c86854590cb12cd90083935ea357e5d88d76432dca7887af75a	2026-07-17 11:30:41.041
515	287ce3afe7cc6e6ff7d3c47f8f45fe352c7245d2d02f0a5fbcf8266b09ca491e	2026-07-17 14:58:24.557
516	cf04ec15e9a735c169ad26b21d496a1cfe4d768f1a3594c65c9eb5df72a72de4	2026-07-17 15:25:03.626
517	62fb59f45c0d5e23f53e4e0a1b9f68bb0dc1c6873959cce4713a393d374525d1	2026-07-17 16:29:22.678
518	87567464529f508329ef1ce8101db8f700bb4cd6a4074b49494ac977fbe6840a	2026-07-17 16:58:41.571
519	eeb6b1d1ed594fad031de19faab5011fe1b9cdc59b6d3daaaf2cad1cb4e67df6	2026-07-17 16:58:47.258
520	0887087922f8052dfcc2fb63388d9a635f5e0bb65e1978f4193f324a3f5f0480	2026-07-17 20:11:17.926
521	dc07739e39c72c3c4cde1d21a9b57ff88cb72681ff02ba5f3a71fb2a70dc7838	2026-07-17 20:12:06.003
522	9fd194d6ceb8bb6f196e24bd1411238c7ec2fae6750bebe40a06d51425947deb	2026-07-17 20:12:29.549
523	08794a838291ee8c7ad025cb244ff298360a638e5f317d3dd5371b038ad95a63	2026-07-17 20:13:15.679
524	c81925b0daac5184520970d76ab90dff77bc2811f8ac12e4b9c86a290679250e	2026-07-17 20:13:37.544
525	0d6c8084a466fd43e8c8b28dc9b9c46ed06a38ff5100364dcdc859b202cea898	2026-07-17 20:14:07.532
526	511c25a836480411460126c360ea08ad1a29c3fcbf8ad715e1418a739368fefe	2026-07-17 20:14:30.643
527	dec373a7c296f223814360b1476593374b274f9fe7f7783db85bc66709765558	2026-07-17 20:14:55.536
528	22727a0999d6e18e7b7d96ce7e5bc9132fec9ef7f52734af5d1bd9ad0e585366	2026-07-17 22:42:58.57
529	d9081a32aa701ea609be38bf45e28bf16be1e3a4f4ae0bc9b39595aa55d4f6bc	2026-07-17 22:58:59.126
530	70cc1a7ee00c9a8f07059e0dfb00250b60d735cfb392bbff46f508c429331571	2026-07-17 22:59:23.6
531	7b9ee5ad5ff5c4d548ef63881e4ae76d0aaf2767e3721af52092e41fbbabef84	2026-07-18 01:09:22.767
532	5c62c29276ed8cb5970a95d8e1e1744981496d527ddad82512c10fb19840b756	2026-07-18 02:56:53.002
533	dd48948e90f8e2e1e3fff2841e5655b650fb6f60427f3599821441974d8def89	2026-07-18 02:58:09.347
534	02498ff5ee95fb9b90d6a58ddaf48015a8f6ed0f15d2efcbc429f37d8e827c8d	2026-07-18 02:58:32.631
535	e5c3d2c74468ab4a72d23584deccad673857e3330cca78939b92a85e7045f0e6	2026-07-18 02:59:21.875
536	14c19e98078b67e427d140e349c1fb1a00bfebc60cbc2882d717baa66253e139	2026-07-18 02:59:50.059
537	936e09010a9e4d4b1f5de347f5e0e749f874bab1b72ccc815f31326052bbdbd7	2026-07-18 03:27:50.127
538	4ff2e90a43789b3aa895fb7499b2d7a4c75d7d7627dca5b9da7ab33de2894e8e	2026-07-18 06:22:31.391
539	4cb55016ce59fe741924a1a12d58f48ef343640205594cfe1196079487a1be1a	2026-07-18 06:22:50.223
540	4162763cfab9bd318427f1312f591e379654754a889843d8ef832eff474ee0aa	2026-07-18 06:35:06.224
541	5c69a0922036b89ecabc239767c536ea2dfdaaea8dfa94978d891836bbd55ac9	2026-07-18 09:34:47.622
542	fd05107554425ca425cf1b426871ac1d781c7906c30dcd33d187ce05b4ef76b1	2026-07-18 09:35:09.928
543	a2d48012fcb34df8f59d818f7dd452f13f0b042801299d75c7e0ef2df5c00281	2026-07-18 09:35:31.519
544	5375986889bf973817a0574293d5f7ee66cea8cc01794dfe7abde4761d2b1d4b	2026-07-18 09:36:00.683
545	97457d354e7456d096091e2d767f2ee3eaa815f60684b29bf1148076821e1b20	2026-07-18 09:36:23.387
546	8660beefed1d1d90cd4c3cfea6f2a473a7d3f15bd01ad08e831ac40fc7bd2801	2026-07-18 09:36:49.068
547	f6a849fd2b0586d54be16eb6d65803610826e3afc32c999e3a970977a91a8a29	2026-07-18 09:37:38.421
548	53eff84db9ffd654f3e5941660b94c5fba142d218131e39965e02485d1f5868e	2026-07-18 12:01:56.788
549	510ba54eff3db8bdccdc1950b75c5d71ef77eb4a9815145a3fa2ef9d9232a2e2	2026-07-18 16:31:32.891
550	3741f43f1471a2cff3ed8a3549e7c29596d9612ebdc35e3f3ca23407e7afe4fb	2026-07-18 16:31:41.686
551	632eac0e3527b321b056257b5a47e10fdaede19f6a1599aaa1263739654a42f5	2026-07-18 16:47:43.861
552	939c419e67356798070cb9d1e49012e6fa18182c38a3d32abf251947a3ffe97e	2026-07-18 19:26:40.007
553	fb0f3f4f3ca91d3412674f47570f4c8f56bd6422f482c946a001d63bbc17ecf5	2026-07-18 21:53:58.963
554	075154612a0a7cf12ddce4921454c8b63ef1b4b56840d9f06429b2a01fbb9209	2026-07-18 22:08:42.013
555	584f0838a2536427f52639597f349c7ce0e1947d9978722ae58e59ec999b79b1	2026-07-18 22:09:34.649
556	a671709fb3da8c08850a6ee3eebcb63d90c3520e0f8bf002a32eb7d7c1f17839	2026-07-18 22:09:40.219
557	db187dd61eca259c96c5018c3a6e3a337ac68ee2c14aebbe09f258a31b754183	2026-07-18 22:28:27.479
558	40890c79bac79b5c55dce0bc9e55cebdce4c0a369ce3e9c4af2fc0f137c62fbf	2026-07-18 23:41:04.802
559	82d8409871e7700330527e5a5e5c522f1954536c589c2a1e2dfc506729b5b85c	2026-07-19 03:53:23.015
560	38fa829f5fbcd03fbb46c9735f9b9742c28329e4f6c41268cff0e10fbd24b3fc	2026-07-19 10:15:57.471
561	39b5874216a47316ab450ee89e6dc4bbb31db27158e18b200b538dc16e9508da	2026-07-19 12:11:54.672
562	a22ec69261444769e760f701714144913f5102787890e5680b08b2aad4b36b51	2026-07-19 18:52:36.493
563	875157216173c734ec954ae138d3f26faa0c403ce11e0700c339b95ab3943cab	2026-07-19 22:01:52.089
564	b4bbba5322ca8701f79507ea11bb8a47651ccc14d907e08f5598e09ef5a1f85a	2026-07-19 22:02:04.862
565	3e9841b5d01800f933e27717f06803f44e1e0ef65836aa12d446346d3a513edf	2026-07-19 22:03:03.564
566	ab721ef145bad87e513f9faefdb08573d30ea42cd6b34104ef2ef9d72d8eee19	2026-07-20 00:16:03.141
567	18a9cf24e58ba20df0df16456f5446c679974d06a0cb3e31613491d90a75724a	2026-07-20 03:56:01.447
568	d5b0078ef91f8e4cb14a18d1cff3c4025f4882133e68fb3479adb064f9f6fe49	2026-07-20 05:48:04.499
569	8505afb72bc4ede0388c55db50d1d652760585ccbba1a2fb0a3818e1dc276629	2026-07-20 06:12:37.963
570	44487e8da63c17f94bf0a5b746fc98e2b6542d8f85b1a89c71fd6919952ce69e	2026-07-20 09:28:41.207
571	bf5d8b76bd5cc1ca60f5c88a4f4e0bdf80097ed935352b46cef905e3897af073	2026-07-20 10:53:00.034
572	60b05986dc8e99a1056603a2b0636e3a7cbbad5b854c62bd2eacb13c47b5fccf	2026-07-20 10:53:18.981
573	d21955f1cabe2f057be066834e526364cb901b8234ec3c72c86f0bafdb5aefb5	2026-07-20 10:54:51.112
574	aac8d98db24b019457efe6cc3e143181db883c50d6fe78d8e2f8577942072f30	2026-07-20 10:55:34.816
575	8882f77947c277e052cd0c412d7150c57214da717ec30cee568d25e60b19d475	2026-07-20 11:02:53.323
576	5b5e68348e09e5f324bb59a50764fb4c8ab9c4256da12c3bd47c87c37e076cd1	2026-07-20 11:05:34.798
577	bd0ad410948395cd4bce031f8b67a0d88c365bb3887b264f06476fca728a1452	2026-07-20 11:35:51.98
578	a071170b46e141b14bd94013d5aee6aa50a34015565b06a5f52ff469b994d40e	2026-07-20 11:46:00.033
579	8caf9afc9b2b7b7706dadd3f9942df22c0309a66ff0bf9f9af8bd4a79cca6d5a	2026-07-20 16:48:04.189
580	e4508dd0fbab5a5b541064409377728fd02fe7ee89901b2b0114cbdeebdce062	2026-07-20 19:01:27.963
581	db77b61902c76bd6ca03c20d14fc1c1383380a7b3d24f19b6f4ffc99dfd47b71	2026-07-20 19:15:01.694
582	21ff79b9ca3ff7cd7119b1ded29cadb47d4f776ee20a6c9899c9710a87c2cdb1	2026-07-20 22:46:42.208
583	b5f6a06506ef73377b116b6fa000e459bb0844893900e88eecd42543c250ea71	2026-07-20 23:50:59.332
584	182d7b1e43200e8a3379d0738f1d99234a1aa801ce8ebd592ba607795c412665	2026-07-21 01:49:28.073
585	7a0bc50a0f00c33f384707f7b1df4c4e1908da7ac6be5e7fa220ba95df97248a	2026-07-21 05:04:16.012
586	e2bc4d4dced79a244ef9ba247ab41d7feb45bc12664881c412b35efe387edc61	2026-07-21 07:06:43.147
587	23b679327c7ade7c0c6e28fb73ef2607b11bae6aa8ac0f462bc068d8a1582a1c	2026-07-21 10:51:13.355
588	21ba8b7d0486e88173f5f2a80aabe3da0a45aabe5200689016c152b208345831	2026-07-21 14:58:39.576
589	c8aaa9f7aedef6c86cca8cb9a9428628f03535faeaeb841b0607ea2c756d04b3	2026-07-21 16:48:23.822
590	a4f70c60dcf727766d61f24d0af93709442c8c5a74e313b54788bf8409691f6a	2026-07-21 19:54:07.566
591	8e32b69bc1609f885382a30c1e4323a80e6b17ae8c9d3725377a111c65d41cca	2026-07-22 01:45:49.36
592	07fc7bd0f942c49108fac8fefd9471211e4d2ab29133b4f3e40d50ba40aba0d6	2026-07-22 02:42:45.997
593	9bc9def66f03fc3bacdfd6ea8c6cd26ff1b498b6ba72066ed930f8aff54adac4	2026-09-11 10:21:56.582
594	daa05b8a742f0e0702e0ceb6aac1cc8121e1cfa945cd5b5d5e92b5426e6bc8d7	2026-09-11 11:41:59.025
595	6063a53e23fadb62fd1dce020fb1655a34683d1c4837e93751cb1f6d8625a77d	2026-09-11 11:45:04.379
596	22d19c93c19a0564bb151f6a1c269c81116c11f5eef8a805979332011aae9518	2026-09-11 11:45:07.942
597	fce20216754f910fd8ab0e89b24e1bb007cee5187ca2f137e30441ae7f80e045	2026-09-11 11:54:52.332
598	917b9a07961b6c42905b279b09b4eb9662d7d24e5176d67f8f88b2779c5d6650	2026-09-11 12:40:49.064
599	d58873352ec2001a7e6b718412a233320071bd8dfd4ca542d9940a61748a039e	2026-09-11 13:21:56.329
600	3fc990a4740213a57935a2dd93a064355a33a3a4c592f193a9fb637bc4f7a905	2026-09-11 13:58:24.894
601	4a368bc661286b41a00a52a81170b75d8bb14f1b08e3f0369c8d32ec4c8514cf	2026-09-11 15:56:20.625
602	d3de0a06cd58269418882aaa95c2220b2e482a1dcb9ced63912780a3af0b64d2	2026-09-11 15:56:27.014
603	43b61f9bdc8f54e4a53901e4199f657ecd80c5f0727ac013ce85d25eff176884	2026-09-11 17:40:00.657
604	00a38cc461b67cf6efcfd1d35ae2ddda895dc78166364ac10af3b20b7cc10e7c	2026-09-11 18:32:10.508
605	c7cd9e66bdbeae77ee9d447b3cae72fec131908d12f628dd06d8c0dfe0cb645c	2026-09-11 22:12:03.149
606	3babcf6b3072ff7e4023db1ae61e0ab323ff89e6f291b2dc410274d65978141a	2026-09-11 22:13:53.54
607	b232f41929a68c668f389bee6133b6016ec55832ccc8486eaf37d2d4c15157df	2026-09-11 22:41:11.669
608	1cc08259fae711552758194b28698f3dd177b7f4d899a2f4e3666c538d0afdf4	2026-09-11 23:14:45.757
609	13dda1dee1a026eec56844c7bd5870693fc0074bc445d0946e6bdf762dbebf63	2026-09-11 23:27:07.566
610	620126a38ad34ee89897db3150237523c3bb90a5f53ea7e6d6374cc0e78c1333	2026-09-12 00:48:57.311
611	18ed09973207407ed808ffebe499be940c7b8d2815bea2d1d1856b53aaccecb2	2026-09-12 02:53:20.853
612	06152a1ba6cf464da8bba231bc2f260f1909aae5c14fe97e48ddb0aff88e8a27	2026-09-12 02:57:18.734
613	9f7b587a19ff2c8fed6ec1bdfe942350f8c37df1e5a8ae000e4f7288d596385a	2026-09-12 02:59:43.208
614	5087a6bf9cfb8b61daf342ff5fe66c8eca7551a5e317228cd41af5b7dbdec916	2026-09-12 02:59:43.818
615	713d0cec48451b6a9a0e2a84df47c379b3672125c8557b86dfa7b0301fd96483	2026-09-12 03:07:00.657
616	8444f17b1f77f035b17591619feaa13ca7cffcca44e3265bf28b4a4a48d9fe9f	2026-09-12 03:51:45.672
617	72a5d0ce39d208b2664170619a0b4528022b22cb4377e35aa3442d4b75ab184d	2026-09-12 03:53:33.447
618	82a10512b6cf938307a24e7641c243721c8741da37429d5ef9af6cc2b54b1d7f	2026-09-12 03:56:24.806
619	495c0c33f101101158e626405d75dbfb1f1185234c9b1c5482e197e3cee705d8	2026-09-12 03:57:22.493
620	abb01c3c1c21af86476ad02840ebef69e40f5beb17cf937674da1b23559211aa	2026-09-12 04:19:26.503
621	a93b5fdf4b262c8012fee65926ee193e5bd44975924504e8c28fb98b31ec3351	2026-09-12 05:31:36.717
622	f2bc2ec5cd8343004d0d762dae8a1d00b9e35505b7fc756a1e6bf17611ad127f	2026-09-12 08:15:44.295
624	0ce91e95cea94847b297d5f0e9f9a862866a86bf58ea041dafefffc8902cafb2	2026-09-12 10:02:51.846
625	45b2585529b89019d5a9be4b2688a75172b4ea8db97f00c0016825d6d1d8305f	2026-09-12 11:37:19.927
626	2eff924e066281c1bd5df3859df6a915ee6f66072b3658dd0d7884a25c4c7ed4	2026-09-12 11:41:41.671
627	36fae2180583e36502a37f31ab01c6c89e462bc08bb68c57f0a9b76113b4af39	2026-09-12 11:42:43.041
628	fb753da1babc8ca99bb214f315c8bfeda89e134c422a8cd3b2603f6398db22dd	2026-09-12 12:05:33.493
629	ae08e9f3e84c1bbd10d0b296461f2550ea9d5070257b35908f337dcd72d8ea7e	2026-09-12 12:06:48.918
630	c007af885f5ad6ec63179e6d7babd83d296492bf44f1280066c5994477fad385	2026-09-12 12:07:26.551
631	eac88c5a9352436526af8cf47e158c6ccdcf98d3288cd4abc43abfc49114787a	2026-09-12 12:08:23.565
632	4f6f07284f6f5dd92923c3f25d08ddf79f8f223214827c6742509d6755ce1051	2026-09-12 12:10:19.906
633	3d5d70364c4a0c0c5a5db9d20876de29ef9f775a23842ae43db939644dbbaa3b	2026-09-12 12:33:30.347
634	ce46522270ede391be42242fea256ebd1f0c9442a140126f8424f62a0d47efe3	2026-09-12 12:46:22.811
635	ac21b5b23725d491e56cb5e0e654555f377b8dc33653a02697b029c4956735e3	2026-09-12 13:14:09.216
636	5bda5e358e01af79f78f42a041f9fdc686886bf848e2c84df88c744d7600aaaa	2026-09-12 13:25:12.257
637	dbbdc80189ba3534d8edcefc7817ef10c980204ffdd4466875fae500ce6c4817	2026-09-12 13:25:50.078
638	e3d078a62b60eba68d9c7eb3e03b18f0548766c67ed0c2f28dae3b802730e834	2026-09-12 13:26:05.922
639	1ab36758dc0a2b31718977269521f25a2a08e48a1971eab4990ab048f68f3dfb	2026-09-12 13:26:35.322
640	7e1a703ffb141329d0c7e477d0eb18b3914154f734557e1607cb4c1113200791	2026-09-12 13:27:17.275
641	f32d93a29c2db0c4fb843135bcc39a7e2d993151df9a96cc4d069910554d48cc	2026-09-12 13:29:18
642	2722c90f7caa0cd4ae3fb30bd28553c714688625437f4ca324ea02605c1587f8	2026-09-12 13:29:29.204
643	d96e9050ea855182bc99ca065d57190ba9bf23e4a8600b5a54a4ad31bb5de2a1	2026-09-12 13:31:16.485
644	5e727a2ea4457004bfd9b3dc1ca461825210dfaa3dd1bb4500bbc732b931fb67	2026-09-12 13:33:45.837
645	fb1528e369884827b073b38c528acef2ac35b7e936e7a1e939ef391503e04197	2026-09-12 13:36:52.426
646	fe251e2875caca7ca4ee3bbb80d78467808befbbc39eafcc6e97addb26e52f88	2026-09-12 14:07:38.022
647	ac72312c2790f8ff6aa7294ff5bbed5fcf41878469efc5ca7be364e6204b52b4	2026-09-12 14:09:15.999
648	7f263167a7a89da6535d5045dbb0513f0dbeea820410594dcd75fcf2d282f52c	2026-09-12 14:13:04.949
649	59038d542b3be1f77ff43cf34b8f466265d73c755217c20e8aab3e2f30503702	2026-09-12 14:14:32.903
650	159938e3ea51b54fba6a121d6fe8d6182230e8cb7ae1d61de9505d851d6bcb17	2026-09-12 14:27:07.846
651	fcd917061901c788895840521f6ee99ba94426da3b95f72729663f4aaeab82c2	2026-09-12 14:31:55.133
652	c4d9c251ac9c30298cd09e8e300a245d4890713b8dc4160d3fa2c766ba1acc6c	2026-09-12 14:35:05.547
653	d80a4cf9cb047be903c33e0bdacea9b1e17f56f2b15e5c4400fc8247c44eaee5	2026-09-12 14:44:09.352
654	285ab860742f6ad335c42b7ec866be94f8481f3721632943f72ea055dfe324ed	2026-09-12 14:51:17.76
655	0cd60488a39f3f538a9cf387328c7fd8281ff7eae14c2a40d7e3130c22961e98	2026-09-12 15:08:32.847
656	ba039b5412a368cfef48ca6b4646eeaf4aa21f64d6051627000447d53b956ead	2026-09-12 15:10:34.385
657	a1108df30f5c5a5f510cff05223bba23517674861d09f22c43b1564baa012a51	2026-09-12 15:13:03.676
658	591ab5e49d02989cd4102492cfe5bb29cb4fde32a54310d87044bb214521c315	2026-09-12 16:27:03.42
659	d7de698625c4cf897b30417c2c5f93e1cf51fcfb6f7843472357a71aef084886	2026-09-12 17:19:22.204
660	d93745d5561a8fffa9e73d1a6edaa26f9a7aa750e4489a8ce2bc6099e44a6a5b	2026-09-12 17:19:50.566
661	55a80453cfba069536fb6cef8b4919b4bb6de47ea281288fb2c4e10fe14d2cd6	2026-09-12 17:25:36.864
662	6ad65762b5b46e5a20b96290496c7e065baf7e671a9a308ff79bbfbf5284070b	2026-09-13 13:39:59.094
663	3e6ceb442a6d1bd664cbecc1ccdf4e3cd471fa420fe062d49aa7173ea01e47e2	2026-09-13 13:48:04.541
664	5b9f7ea9015606487e7ec5c65db3d606f5284cf1a77b92e8b771f07530de2006	2026-09-13 13:49:35.695
665	ca33c3f6dbda29d3389bef433d617d3cc1046577d7aad416cf57677f2ab2a3cc	2026-09-13 14:27:09.241
666	4fb05281fdeb8230b8658c1902a779f8c04137b5a7af64d5e942f46cc6c51189	2026-09-13 14:30:48.756
667	8fbac9ec1ea5be00494a7f926abed20251e6f6162aae26baeee54554d09335b1	2026-09-13 14:41:37.177
668	dbe87eaa9326914bdac6882bf7c57e7731b38de8e938c2ae1b43cd20e91c50a6	2026-09-13 16:05:22.822
669	a56246eab2aa5856fbee3104f896c2c748f2b105c3e719db3a8fb3f69537b671	2026-09-13 16:06:17.348
670	fed78ed40c0584eb89f841d817a69cb29785224962cc025a0bf00c60514d8939	2026-09-13 18:09:26.29
671	02b358a0f11d5c4f768473ce5d9f1058c61183c403b962f258fd1b1c25a56cec	2026-09-13 20:17:37.33
672	40a1a5fd0b41164e72b51ddba734057c5a0a5e49f32ac065fbe868dd981cb014	2026-09-13 20:48:14.134
673	00955292195e893b831c707e501c0989c7a371895d3006851c5af0bea683cf7e	2026-09-13 22:54:05.684
674	17e90c8e1f36da3197ee858c87b3157c1d2031920233818ac1aac1800efb1e98	2026-09-13 23:07:08.977
675	5f636a43f4b8acd61e719fe5e51f4b777713c17ce08c7e013caef92cdc100aa9	2026-09-13 23:31:13.924
676	34dab3c9e58acdfe915bd78e9b82da1813c31271f36ec0f99d77726af4e53ed6	2026-09-13 23:36:15.877
677	2775d14800e2872dcce49086294c48bc1537ba91c8a2bbc95bfd4f3591b3452c	2026-09-14 00:08:56.802
678	9cc4d8a54160c272ca2fd6cc30e76232eaf23bfe69eec9ea1f8bede0fa1b3467	2026-09-14 00:13:09.873
679	bec43b4fad3d5f946f104641fa7fb15f10a27f28730e0a8d46868cbf4466ddec	2026-09-14 00:15:07.895
680	d6d8905d175440e1d0b022c088edc1d2be20baa5ed3ef759f5d2dc221f09f770	2026-09-14 00:51:09.173
681	2eed79de0466cd5849e9cb4d30e43fe88f604df50d6477d8825c31c3ddf3998f	2026-09-14 01:02:42.101
682	163e56afcf43ad4bf8964c73ba5fa0909441fddc9c77211dc13d5aac8b7ba1b6	2026-09-14 01:06:25.153
683	5d3c03224255406cea69e30d369e20b4cec9deded6b926070e82309945993f3c	2026-09-14 01:29:32.845
684	aa927eabaff4ad20a3e321b6a1032fea087f312c3c4940d6d36fb88023e6a00f	2026-09-14 01:56:00.324
685	cb47fbda494eda23cd85c2119ec1224b6b77ed257f5a7d9dcdf0c9c0470375d7	2026-09-14 02:16:15.198
686	ee7a5018a10f492ab226bf0fd6b309dc7ace2247f21aae5b210a77f2db46dca6	2026-09-14 03:09:19.951
687	c0a270728d2a5fab1181b68229d5290f3aa9dffd07929ccf6fe7057fd2fddd4c	2026-09-14 03:14:56.106
688	7d1aa52573430816dc54f146e052fab0ea8f838575a761c211817cf124392bf0	2026-09-14 03:36:51.217
689	f00e170b3d326e90597642d046e9aa219c9e37d335a944430118423adba37ef5	2026-09-14 03:48:57.545
690	17611c3449c2e071e84b700669ad55d365285809bcd10a6ba354dff4a61d5719	2026-09-14 03:50:53.828
691	bd0032ca9c1f6fb6e96851a9b9a3bc6aafb0e9645ab9390337b284ac9ea3be1e	2026-09-14 04:12:47.489
692	6f9fb61e26ca261203b5f25f9fb68f7767a916c526af2767445ebfec4616da0a	2026-09-14 08:44:26.96
693	3f8ebd2382bc36221a0dce1b1b6cd48735b499f3f3968b7017911a9434483bb8	2026-09-14 09:50:42.765
694	b2da7fe0558286beefb7b925643d72544311cddad9568df89fd6255df822ab81	2026-09-14 10:30:44.214
695	a45752802b58947f9e6d985e227040797e9e4b77696a6ed3d069a9bd7758111a	2026-09-14 10:38:39.459
696	ce37e485ad6c5ae4445daba357edf37f4b713a4ccaad98d0f429232dde44b962	2026-09-14 10:48:35.809
697	b44fe826f4e31202b60e33e39e8f34f7d7a71242bf02eaf143a0e49567093462	2026-09-14 11:18:22.028
698	46c9617b7418cb0cc14599df47a127f818f857aaaae37d9e5fe8a96e334dc547	2026-09-14 11:41:29.327
699	8a5e3e93e2817d2469c3b24b22e3e4d8f05d19ade8f9b7abad915ba7fa5f0a92	2026-09-14 12:13:46.769
700	63deb920aebb20a8e23b050366819714cd7761528461fafa8c70dbbacea748ec	2026-09-14 12:16:18.975
701	400456f68d687307eeb57e397cf44ddbb120972a6b1b658c391880a67472c3cc	2026-09-14 12:46:04.968
702	39552529d4f69053ec8ba3a87c0875f169e65a56cd229d863c1fbb54afadc298	2026-09-14 12:52:14.09
703	a548a187fa3969c0a71bfd68798e76954c33d6ed9180d46ccdc38c7610e3c831	2026-09-14 14:16:52.065
704	ac73ee41a5d0325f8bde18ed77b4e8dd83f076fee66dab0477df6277f68d175d	2026-09-14 14:44:29.96
705	34fdac13b0ea7c09d1708a10fcf2399abbd68f9b35f47576b1e72c5ff295ce7b	2026-09-14 14:50:21.72
706	db1a3bc0acbd91f90046f1512fa0d975450caba8d3f7b8b12b0d2d6040bdcd19	2026-09-14 15:59:01.611
707	33aff5b694980933e75755454cc6e19e5b4723d64efd54eaafcf982efcbb7a6a	2026-09-14 20:10:55.778
708	4df67eed5cf1b12e63ef99b64085729eebd070b0574b53311f0ab4d10aecdbbe	2026-09-14 20:25:26.504
709	eabd15ecf755594938f0f1a0f1e259b588bb8783440f8384e1fc6a1d025a5acc	2026-09-14 22:52:09.732
710	338a00ec4ef81e03919d60f34fb87028cd22db1bbc655ae64f6d3b837711ebb8	2026-09-14 23:26:59.709
711	2478b3dcb357a0ea6139aacf7dfa20cf090d8ed0b271bc560138e7c8aecfb803	2026-09-14 23:58:01.703
712	2192b4703eb526aca1177179a1de6d1b2f8006aab24186cc001dec9952f5a24c	2026-09-15 00:06:38.577
713	c709aa398361e3f767506cffc70cb9f7a679954ab75c6d8ab250696eede7e38a	2026-09-15 00:11:45.4
714	77b68d6d8168636db5f4714e54cf115ac3f92dfc488159e032a933d150778788	2026-09-15 09:41:03.84
715	416d7e8de002c9b00376ffa6dfd80750946b2470fe9c13fe2a3bbc6bbf18e236	2026-09-15 09:42:57.471
716	fd29180df4dd2661a417cef480f6907f46e29f5ee82a0ea35cc93b4e8010d1a7	2026-09-15 10:04:34.712
717	607650ff4d08e9d5a24c0e0a25845511c8de49be9bd64804d2122b16c892b831	2026-09-15 10:06:51.322
718	e57c918f73820b14f65eb389f8a005c0e111d88d5fa5132a4138cc32838a1f09	2026-09-15 10:09:35.514
719	921b40be2551a44aa006a4dda64d581ffc6bed8d8bbea6ba6af30c719e3f6f79	2026-09-15 11:21:43.047
720	2321328c26017a4cce403abba0058f32ee2f85d98292bf76f788ca6d3bd776ff	2026-09-15 11:27:04.715
721	736cff8ed4e79c01225060b092629c810d95019393265f020b57b9c6fae7520e	2026-09-15 16:50:35.053
722	92fae0164210fd914505ba174c60a455be8920da25623720833217c1850b1065	2026-09-16 01:07:13.11
723	516c335800e6f0db7396372134a5a8c852910955bc887a1a2fc0fab96d571cb8	2026-09-16 01:45:42.774
724	5e01eaa992ca766f813ac19c67f5d623c738d569e3e6190321a8bfcc652e101d	2026-09-16 02:41:12.301
725	3c28be62e687a3152eb32873d2e80e7c1f0a115b2237395207f98fd6513e2a96	2026-09-16 03:25:34.196
726	15cd8626a00e67b295e5d2a3cc0cc6a616143d72a3f4727d92613902d8aea03d	2026-09-16 03:34:43.651
727	58befcde5b96825f9e7672b25b0e79fa799735d527b939e74551197e6b731b68	2026-09-16 05:26:56.195
728	2ccfa9d1027b94433e0edabd2f0228992775ab909f82042abfa3c5e9ecbcf284	2026-09-16 05:28:42.668
729	c823936f9a32ec9de7d47b84d99c820cf0cb1ec92224f8c543c1fc26071a8c61	2026-09-16 05:52:15.011
730	6160befc2bb45ecc78b14c128d6cb4acc7c643452176b1c8bcbc5ff010f6bef9	2026-09-16 05:53:21.115
731	30e68fd9aeb0e0f84eade692c594f47e1ff073067e6230e8c21e2bdd67186986	2026-09-16 06:51:12.2
732	7eac99aa077fddc11750348276c2a7ad4b3abe993fab64de5bc00abc010a45fd	2026-09-16 07:15:54.102
733	6051231e59bb1f6024127823a8bfde947c2a3f5e631b161855ba449c51450c21	2026-09-16 07:21:41.518
734	5a96035b1ebdea0883898098073c9ef47dec9d58a375661c5da79415f0447718	2026-09-16 07:22:53.647
735	d285c068fd81fa6b4a7d4d201e220a9e9a3309410bffd18e4c37a7a0d4539a2f	2026-09-16 07:24:26.514
736	835e4fd1e919b9819204d233dee6250e0000b10b3660b6c72aa7daa7ab0c139f	2026-09-16 07:27:36.202
737	a5c120e86d11ca67ab0e024e5f67cd17a769f9e979dc04a4b9c405f9eafb1555	2026-09-16 07:32:42.301
738	19d667e422f5b0b79af60a8c5adc730339828020676e58d709f6b8f195b83b8c	2026-09-16 07:56:59.763
739	d5c08a2d11fe3017eea428a8d1885accb6a3d83934091c4c6912047881d8f640	2026-09-16 08:27:02.912
740	07ffd264ba509e4eb6d57b6d5d29e49dfd61cc4b555cc0d71104e48ef937199d	2026-09-16 08:27:46.183
741	f8a46163c06da28d560ce751db1e05f1363902914ed468ca1f5fc3ace04c04ec	2026-09-16 09:24:31.081
742	fd9678f79213129916aec1619cd874f76e6d58d3f49c0007db8b96963c54060c	2026-09-16 09:46:10.784
743	522821dc5b82a4d0d81f6cb07dc71605f419feb709e8771352ab04982fb15c35	2026-09-16 10:10:18.536
744	982145ceddfd65459c9fee7734cd0cbdfdf196338b4489ff99b924799bc4250d	2026-09-16 10:15:46.719
745	c766ba1747fc7cdcbc006fd77d1b823614776bf08c24d3e7f7e47147c6575671	2026-09-16 10:23:00.485
746	477963fea90262eda746c7da0b8321a07fdb6e8f8fa48268071378fc64c70c1e	2026-09-16 10:25:26.565
747	fca525d9fea39590ce1d81d27d7dba3ce2c5082f0fb7b3812229d4ad2222c45c	2026-09-16 10:26:23.93
748	5056391ac00f689613ae70e0b060f721ed8b1cccf75e7de704189b6133df8678	2026-09-16 10:57:01.363
749	07e1a9cff0a17bc694c9922ab2268720f6e38a63e186bcd505273cbd464de72d	2026-09-16 11:28:59.28
750	47ea5967d8cfe43a8a1b1ace277b102930b248b147bcb91ca8afe8c51b7c32e2	2026-09-16 13:20:19.393
751	57bb10a82f1d99746647a407717843c93b3ceaf67c9dbd0265f4c82ed149aa41	2026-09-16 13:32:22.806
752	c807c6f4e6810f9f81236ba44f5ccbab62af750b399e2c6f10961285d5b1ae9f	2026-09-16 14:15:12.375
753	27c850afe85992c1c8df0bd8d43881fcdda9eccf2aef7b4cd176872556d56a5d	2026-09-16 14:31:10.798
754	21346335d658d818b45256ad00b0325935318aa789bf40399a0d097c17d1272c	2026-09-16 20:50:21.061
755	e3d2b3cea54a1d71afc151ddd073e25db1d27667a0ef85425ea4584fdb73d1e4	2026-09-16 22:05:42.999
756	fa6dd5665becf0c03ad2c97f16531dee942483ac5aaffeaaa699baa96774704d	2026-09-16 22:05:55.712
757	5d1ecd5188b0b5702feb4cdc8499d953bef050f5104243b5e99eacdb329baf46	2026-09-16 23:43:52.785
758	e988f3ab70b846b20ded5693b12638e24fe6e9c34d3be2271394631c7acdef7f	2026-09-16 23:55:30.364
759	eb26c96a29da0fd8d5bf6f35e27ea1f873a1954d7213a6992728696902280df2	2026-09-16 23:56:02.889
760	a8a27748ed01215aba9721e52c793681eac056f39077ce65352a206e69fa252d	2026-09-17 00:02:33.069
761	d63572ce93621eb3ec0b4add2dbce4cfad30dfb1f76d0b4eb7688efb5a31355b	2026-09-17 00:04:27.228
762	48bae48ca118cc20ad370011873211bbdb8736f72eb7b9646a2bb3a0a6db6b8a	2026-09-17 00:09:58.576
763	a6436bcecd2ca506969c4108f06ce92275ef290f7112e61c2ded7d91abfdc34d	2026-09-17 00:10:58.837
764	a7567c566b79bc678d712481e5f7d1153e42bf30f6b1ae0dbe2c26a7df058dc6	2026-09-17 00:15:28.128
765	46ce89ce150edbf08a24366ea8bb38d91d99df710cf912c52473ad3feca1a7ae	2026-09-17 00:16:08.006
766	bd2903e60a954833775cb62bd3555279aa08ccd83067121c2d6eefd5c35ca5f8	2026-09-17 00:17:23.171
767	decbf0220bf917b8646385bc6825373f0b0092d77cd5feb31d6200d23b35d591	2026-09-17 00:27:18.117
768	ecfb2fc8b8f507eade12e89972a3168bad82c5736ce54f286979b8db5ac6eb1d	2026-09-18 03:47:43.479
769	682e05496075916fbd2d5f795bf29afd78a3391c42f1c6454eea70e7326ae8c8	2026-09-18 05:49:03.337
770	68ec6d80d7d0e41f918e1091f4f44b6108d08bd0f8c20e10450feb267eb5244a	2026-09-18 09:00:23.569
771	a48082bca67816f256a8c7e09f5ce37a8e05c3175a9e0c19af870b8ba04cb37d	2026-09-18 10:20:50.56
772	dad23ebcc5d04a06c98809408e3261b65f953993e12b606ae04c3b794a0358d2	2026-09-18 10:45:35.779
773	1859ca885598d4e3b502a14629bab03311ebc227da42dc03cd8a6198359c3a7a	2026-09-18 11:21:25.214
774	320677f90a4ed688bd1aa59f6bac3e60e67a5067c30e4278a1580ba77fc96517	2026-09-18 11:42:45.683
775	35bc8088db057d849d306df92ac73ff15775fb7fc601eff8d71593ee4144b472	2026-09-18 11:43:06.762
776	f54dc8dfe88530a01e7b1f30cd4f2942488cf264cb8d8490892bcb8fbe8eaed8	2026-09-18 15:34:55.882
785	cdc5f0190e04cc49b88ed86543f4c6336d52220e63e0662077a1cb14f147b51f	2026-09-18 21:58:17.202
794	85d16b547cf005d5dd8792ef5eb4fc67fa58efec4e234e351ad863ecdc0be9d3	2026-09-19 00:55:09.13
777	1b57e1fdd75602ccbd3c69b3f53c1315e82b7750fe2fa4db10c274dc8302f1f4	2026-09-18 16:56:07.233
786	46ef22e3cf0896bc6ecab5b6a7528bf401725cb5eb225f05150f8af31df7a6e2	2026-09-18 21:59:54.552
795	5b00b47d98a0bdee6947f9ed94e5e8ac630b839a21ec211e4310107580bdff9b	2026-09-19 00:59:03.109
778	47eb539d0b70cce3a1d309b0d1e8dd2b4bf5dca840687dee9ea3c3fdec28cf93	2026-09-18 17:24:48.878
787	7edc383018c52409568cc33b0123595d65b4ca3558cafa37a22d72a95449cce6	2026-09-18 22:02:27.772
779	5d032890068a6c23ef831e48218c0653465023f4cbe7fec8005c7dc1500e3b3d	2026-09-18 19:08:50.242
788	9a609e4da0698df25a468a7198bb17330b39715e914869386367c308e7268966	2026-09-18 22:06:23.683
780	ae9471bf9d74c1e36a4c73bb2c39fe3c7370fc84188e4e7eb9550afb6024c33f	2026-09-18 21:02:03.982
789	9230440373cbee03ca3a858f34c1abfb9df0fba0608e53ce9076b038a3531cc6	2026-09-18 22:08:20.264
781	c970eb96ea25dcbacfc43ddaaf61232ba5bed2c9c584b1ace67e89638fd5a1ec	2026-09-18 21:17:57.908
790	c5678aa7da2ed945eec1f7706d5acf1d0eb02c5b020936c5db16c67a51c77f04	2026-09-18 22:11:35.849
782	cfc5e27e0dd46515abafb0280974fc55e5a49061affa601154b8287d959ba756	2026-09-18 21:37:29.246
791	4c9c46938fa257a26aa1832b62f140bbf4e84b2de4f40c6b6bbc396be194d016	2026-09-18 22:22:00.169
783	c996fcd4f7578e95ccfa1eea5307425cb02c73eb896277db2f1ec927456bdf4a	2026-09-18 21:53:58.44
792	988aea428f5b8335b1f09d9038d698d6d5a5abdc607bbee9b8496ade21a8bcc2	2026-09-18 23:57:14.281
784	c8396bffb62289484406e6e593b2dbfe2d64c272674e040def12f6c6d19c4a56	2026-09-18 21:56:02.318
793	01f65ff564fc5c99b44b7b95aca941ce443dbe905668c228d35410561505ff20	2026-09-19 00:24:29.612
796	15e9ad64c903b31cab12f13834315ff683781ab482e1c9b514b37ddad537ffeb	2026-09-19 02:19:42.106
805	dd6222c764249e449317654b6d398cbf14425be3ff3c615520649624b2e23909	2026-09-19 08:58:07.003
814	f6ffd163672d334835a1f5ebcbcab74ebdd4c4a89e2368efdacbedc15b1dcfdd	2026-09-20 05:11:06.442
797	1c31dfe950de1690b151b5fd69ade12f17c05b7097c768305c3350e39cde077b	2026-09-19 02:23:12.703
806	f5a969ba70e869025dfa52808aa9f820eb2bb4a4884a866284580611cdcf4016	2026-09-19 09:33:22.485
815	aef307ba6ef9c05f62b5723887e393b01f2e7381cf9f065aae1ad2c48e0f8482	2026-09-20 06:14:21.195
798	5377c196b0f5a92388ed2a2ca1affc778e63c68bdd584d544ab4b816956c6be4	2026-09-19 02:53:21.646
807	9c6cc4b6aab669c4c763e988251410182fbf9f7bb5cb1b268a9ccc168e0f4e87	2026-09-19 14:23:22.003
816	b37ddd25d8e70414f790b82af6f32bda8ec171e542e1630321ab950a479b2736	2026-09-20 09:38:05.831
817	586aeb68633cfad9c0e3a694473050dc5896f0e5d368b977d7c705e7e49c2191	2026-09-20 09:38:10.912
799	b0da0cd06e64d0bd34062acda50d5f7b7bc3740532523b317dab42ebd6adb115	2026-09-19 02:55:25.387
808	3d18c775063f7296eec83b83e916694652ad413ae929f2e8fa5b3b68a38078f9	2026-09-19 19:37:19.779
818	b8080568db2f0040c944ece4fbcbb0b301f4d2a2dbd6a4c13d16d005641ddb75	2026-09-20 09:47:09.162
800	76968055beee4eee89c414439b9fe8e593132d23b9b07cb8ad7d962c6fe7d2af	2026-09-19 03:01:43.294
809	849c5a52b6bab9f5e20d96d0264b5ab637a75db43ff456c7116e992df23ec722	2026-09-19 19:49:11.486
819	a95514d1401a095312a335d95864b927156ed789c9255b477c6b235630f8a17a	2026-09-20 09:52:31.564
801	a7aa491b9542ff58b6ffd648854e19409d7917934a87e3ca775afcbba37c8b59	2026-09-19 03:14:03.726
810	e5a727e544f83dc527223a8eadf6d73367790d30b0e683c3bb37f00ab301a49c	2026-09-19 22:18:32.721
820	f0f2de1a0536fd87a5c8b71d5e794a54339d4128914a23dda8b0df6cd2678c40	2026-09-20 10:13:53.669
802	8344593b531a7ab97e94c2167469fbaa3044f5ba880cd6d8433076fc21c7b801	2026-09-19 05:43:25.537
811	cd01d1eb72da2a082ec7c209043f4bf8ce27fdee50a91b1bfb53d9a7f21ead22	2026-09-19 22:22:05.276
821	5f22dccd23c8e30e0dbf8a5b5ae5bb8256bc4a4bfff54cc528eeba329ba0003c	2026-09-20 10:16:41.778
803	5cc52424db089d28119c4fd0eb67fdb5ed44aefe97b6663edd5225594729223d	2026-09-19 06:43:28.01
812	e97754a663a7fbd1523558eca5be80c3e40c927449eef5612f44db3d32812a41	2026-09-20 00:45:18.685
822	7f4b6c8ed31af3fcce1a90f24a3c7bd56bf2679dffede04d686f6ed3ffdf3976	2026-09-20 10:21:16.908
804	9029ce319cc973b0ba0599fe18e016b30202257c4354db6cf75c336341a7c0d9	2026-09-19 08:30:52.191
813	481732929afb3fdc03263b263c4022a1c8eececf261aa1d17c2bac8b094b6035	2026-09-20 04:25:38.989
824	4c5b5a335ea1d8d7391207b397d4a4f40f2185705270b84ba568b1204752d0cd	2026-09-20 15:02:19.183
833	57c680b0ca60d3f0358ad2ea2a6fb98682c548718658e7dde4a079e2e4454397	2026-09-20 23:49:01.495
842	5e55fa9ccc6fcd35602dc354af5155e31a4d6a54d719685e4777847e35d12c8e	2026-09-21 08:55:29.291
847	d75814251e04c4edbd4999d33b31eaca82ae70b9d52f0207b0fcbd47c695c92b	2026-09-21 09:13:55.797
848	4bfd6d71a581ae6da7532b8d9c4bf98775d59d02e361c8fb1441d796dfd297cb	2026-09-21 11:35:05.341
856	02b386b548b5ff984ac0d1789893059940a30d3a76b9f1fdc9e869fe794f2974	2026-09-21 15:30:53.103
865	daec2918ece5e52a53f785933336d49faff3a51401fbeb24e6ba1a125fc1f13d	2026-09-22 03:46:34.922
874	4d9650044b973e9fbbcf920f61d6d3d02b0007466ec7c5271c8d950bcdb5f53c	2026-09-22 14:44:56.635
883	a21f3cacb11ed3fb78c9a462d918540b62b9fcac1c3cad6fd72dba285b5b7160	2026-09-22 22:47:06.746
884	8c8c49cbd22d7fc7f43caecf78bcaa2f053514e736bf25c97f6b6f23df6c69c8	2026-09-22 23:36:54.747
893	533383955ef0cb2792fed6413dead3180846bb9df007fad862aefc777fa80b58	2026-09-23 06:58:17.656
902	a49f73a06f4db97eee23b3cda7a6a211c80bc4f9733e9847f98aeadc9f580656	2026-09-23 16:55:40.49
911	3c85701d504a874e6d8c3337b20613541dcbf3048b2f4b6eb5747051682fd76c	2026-09-24 03:23:36.685
920	68b9af7052eecbf851dd5efa747ec76f3df9074c10536fdea41a995cb179cdf4	2026-09-24 03:43:37.125
929	4aaea719cac9bfbd2d6b397e72f1811348826de65c12752a38f690948f7be8f6	2026-09-24 04:12:57.197
938	4c94315f1624461882974ce76b45601f6aa81138ec789475306bad558e08c9f0	2026-09-24 05:16:25.145
947	88014cef39e750c26b7e95e3fdb0bc0174cdf07ca78eae7ac31a6ac56784d475	2026-09-24 06:11:18.679
956	ee648285aaad5dd505d9c2b23707c6058ffb4b1e427401625e56c94ef2e7f53b	2026-09-24 07:16:07.743
965	5e21e83d7df3779925f4914e75ad0c3cb8a6f0547d8db9f03dd187180f98290e	2026-09-24 09:22:07.312
825	90f473f5deedf5da1854e3dc6881f3e887de0f138842c1fd8671cc4d354f2d59	2026-09-20 15:10:04.295
834	986cdc422d8718a93e783df11c82aa223e2616b8b3f749246dfb09301f7f46f8	2026-09-20 23:50:38.05
843	89a43490bfec3826757459f2bad09c4667183440e2fcd07885ecbbbdf0cd92f0	2026-09-21 08:55:57.305
849	76bfdfd4685bb9e0896282f6927aef4f22e1c6892a6f43d1cd77cbda2528919e	2026-09-21 11:51:13.182
857	d57cc3775ddef826d03dbd7d3a7563cb029ae555c7dfb683bab0ae81b85e35db	2026-09-21 16:02:59.513
866	5217820a42774ee38e1be403740f14c993fcddcc74158f4f6c184f5aec07528e	2026-09-22 06:29:55.743
875	3d309e70f9ebc5512dcae6d27c2fe69e048f5efd33b14d5226d5768e6d024e49	2026-09-22 14:45:39.721
885	0f5cf02b7708d590c167693ba23d5a8d0a8fb3ebff066ff554f314190a1f0c29	2026-09-22 23:50:44.84
894	72b44b4f6dd8995abbe322b3628e94db1b1dfea56cb8915534cff39503812ece	2026-09-23 08:07:59.509
903	90aff1fb6b9bf34a1cfc792e7012cf77eb17db14b22ffe217068a730e023507e	2026-09-23 22:37:39.881
912	c2d1e1f573802500396e70c52dc551788bf042c585998d0799380e7f35103744	2026-09-24 03:25:03.493
921	3fc3389a38afdb0868e70d009bee8184d653cde9cb6046fb7ca1d6b87f5e90be	2026-09-24 03:45:17.737
930	81e8d1f528601a0ec7ae702c19ed253942832e6326ea2b491006993b478202f4	2026-09-24 04:19:54.235
939	e6b5dd3d15c06e7c3edd3b3e49cf127397a95aa2789c808e2a909a360b3449db	2026-09-24 05:33:03.979
948	f66543d30210fba152175a1fc42d490d19651be444e681037887c3a44935b449	2026-09-24 06:16:24.823
957	286abac57400458e0a57eb1c88eaedfe582cf6079f4db392ca9c29e1d2e75d98	2026-09-24 07:20:42.364
966	c06456cc904572a18ce40e5d0f0aa8880e3fa489de4f849a64f9507268b0dcef	2026-09-24 09:51:00.778
826	c17a3cfc1babc95745ab29db8543eaea44e1a023dbbd0839403335578a5662ca	2026-09-20 15:10:14.967
835	d1cee46467fa5c19e86b1cbfcfdf11872f511d996032cd6708773878ac1cecb2	2026-09-21 00:12:13.13
844	e6f222e713bc7bdd222ac436b5aeb377b9c23a0b5a12a180ff4a51c9c214c276	2026-09-21 08:57:18.498
850	1ee8040202e8fa8f46099f8f510e50ba1f57a7020079e6d8b984706cef373353	2026-09-21 12:42:27.538
858	83a6adb65f41060788738512592c816e637c6b19b172074462c0e9c665cad639	2026-09-21 22:05:01.607
867	e6cbbfc7c7a945b3ae55c4c19261b4cd97574449871102f8f477811aaca27076	2026-09-22 06:31:01.702
876	3bc3a4070c555d81448e768fcfb600ef20ff94b52870defacd0331e29e883c32	2026-09-22 14:47:14.345
886	506cd32d64061a01a57d9e019543e2c654c7cdff4ef887e5ce506a6b5e58028b	2026-09-23 00:19:21.938
895	46c862e1c81083311c43fad3f1405c7b65137758251fcb0913b57f54ea698297	2026-09-23 08:20:54.494
904	54a06e373a5fbcb4fb83cc4c20ab7f1852b6c61813ffb027748715b1ba469a97	2026-09-24 01:18:43.192
913	3b6c13776888a91b194651d1ee4b596fcee762292f3c2a34ee1e99c930b44194	2026-09-24 03:26:32.544
922	f94bf308eb28ad062d84e8ef78d710578df44f715f30ced65a5dbfa16e9bd951	2026-09-24 03:45:44.632
931	bebd54c4bea65cc0cfc9974a97632b4dc3b31ebdf6fd9975f2e56e4de2cf01c3	2026-09-24 04:24:23.427
940	498e95e2ff7fd6004948e6ec46e7d76e8179323f5b487a9bc16261bab9a3365a	2026-09-24 05:47:52.255
949	90ba7d1440062402f0a75fafdd381372996f0d28ffc5ce0d9de7c5674ac10635	2026-09-24 06:20:28.986
958	eaefb481ce841f11e31ca3600a897c7952425995b0fc73f98f7ef38595e3f36d	2026-09-24 07:26:25.691
967	7fbc77c34af26887147fa9b611a75e4a26e513402ab0c9030b2fcbaf5fbeab5d	2026-09-24 11:14:10.609
827	0c09a0a41f216ba6636af6090507fb34f32b3a8243f1553cc3b581a0693d90d4	2026-09-20 15:57:32.658
836	06c26eb906d1337593236ec477ad163437bf3a81df32cff8d022b72aafd3a17d	2026-09-21 00:24:41.27
845	f24333ac940786b07983d7e4d2bd7c52425adbbfc8e7cd1e5acf6527e3d00ce2	2026-09-21 08:58:04.551
851	d8f466c21083ec39efa17c155906287b5bd1b163401ba9ade9fcb19318be1674	2026-09-21 13:09:21.179
859	300b2f6b56dfb7b51802aaa2a3e7f20a30b3f5f9e3172bb598b5fbb922c351a1	2026-09-21 22:54:48.26
868	b99b9465df299170dac02a6d6f11d6c954909040b8aa5b8c274816ec761222f8	2026-09-22 06:35:28.863
877	71b464aa25e6cff89d841c1a1cd06b5c50c56daccc9a453e26f90abc5ac25dee	2026-09-22 14:52:09.593
887	27fa20dcca1907acbf8894bf8b9cec2527996caa99cc7905f88a4dca5b8bca0c	2026-09-23 00:25:23.979
896	c22ec2f3833a2773466eb3281629a21045ef8ad7fd8b5432fa9d9d75ebd42715	2026-09-23 08:36:42.405
905	a9c0d4c1dc79f345169aa9136f66ad433caf2f18a2921ab58927816263b0fe1f	2026-09-24 01:56:21.105
914	b74b24e81687b13c95611c15ae6a3a77052658c02606eae94c981f3090e3fe47	2026-09-24 03:27:37.722
923	3780773b82cea4c39ccd7b027f90ba7922263741522175b90ae436d6f39499c1	2026-09-24 03:46:04.771
932	277a07df22dca99097c4d87451875cc48e57c2fb6a7392fb3c184c3401bd54aa	2026-09-24 04:29:13.183
941	63b70a28b3a521068a62301fbf63a4fb50a856e7a2495a2394587168880bdfd5	2026-09-24 05:48:45.819
950	e72d7a41ec7a05efa70b79f73e33b9cf4df57869ec0b4c4139fdf6f6f2e2df8e	2026-09-24 06:30:55.242
959	6705c8947d40da1ab9eac96ad03b82619cdf58df2db04f0fda9368b9409d402b	2026-09-24 07:34:07.596
968	4c26c534adef67b7a9f2c42300009be40fdb456ae6934046ff51823264ebb874	2026-09-24 11:18:05.596
828	595d9150892bcc3c0fa43ab7a5a3e5a38d844fec7a32614c2e10b565803e0bc4	2026-09-20 16:29:23.248
837	ca0ab0ac55dd1d7f524e31b02c31f9efbae28a9ef76bcdb13dfc86fc5f395452	2026-09-21 00:35:47.254
846	ab65552a3786995d410205f5341ded2bd7d509025ca1a8a25ae1e8e796b7f9ed	2026-09-21 08:58:43.376
852	eb88b18c61625ac9e3103cabaa39cb75bd1e1edae4ae1867b8c6d42c6f35b23c	2026-09-21 13:46:09.578
860	c40e284897a7c8f961a78c77720bf1bedb82adfa1763d5d126d63c6f55e4bf96	2026-09-21 23:06:50.135
869	5df869c3895e9a1663343d46dec513c24bbde4999367871702a4ec7e373f1b5b	2026-09-22 06:54:26.79
878	19a7bbd6618a0dfbd38d247f0b0e6d13ec017b5710eb891db9508d8d1e1477d3	2026-09-22 14:52:23.662
888	3e882c53bd4a4f8f60b35d5378c6aa6f1c0c9f2dec53887f6f4b5a5c0505738c	2026-09-23 01:22:56.2
897	229d23aab512fea32c25ef01d330895ca4c7f1197e68a7318bba20f89b2f12ee	2026-09-23 09:24:58.937
906	ea76a18273554c13aa466aecc5042f733ea52d06ff7fb8202b1e64a78e83a9e0	2026-09-24 03:12:57.617
915	d2d4eeae4812e308a134d0ddc35442f20cdee4a5a256ec4e76e064dbc1286be0	2026-09-24 03:28:08.879
924	ad808d4a4bfa49295c8d7a244585a2458d34a740592cd8743eb4579049e3eebe	2026-09-24 03:50:29.64
933	dc54690d12ee25a8a64bb878227fd9f948a024e4f958f527a40604a5621e8c94	2026-09-24 04:44:43.347
942	fcb93d5d69d72a374e707759dca53ef3829f4e69523f5be9e6cc5402f228fe53	2026-09-24 05:57:12.436
951	0f7c3be88a7b82489649db6b8dd40f4a705c247aaf625333cad06e2ae511ceff	2026-09-24 06:32:38.12
960	5b852fddc91042ce2eab5326a7c1d0849415d57577865ae9a07e9225b54dfea4	2026-09-24 08:01:04.011
829	60fdcbc2d6e2dc20734ef90e5b2b413ad84bf9badab45f82f277de6060ea54cf	2026-09-20 16:36:02.417
838	21a9096ca3be28987612faad48e123b7bfe9ea8d94d51205d89c5f0fd9fc79b4	2026-09-21 03:29:57.162
853	23abecb08572b4df4138f0255422ebdce8909cbdbd79e07514a6e6239c881e05	2026-09-21 13:52:43.826
861	66d740058de1b2f0095a115d9d2f0e662f3847fb551406cbc6a5fdcfbfcaeef9	2026-09-22 01:18:28.011
870	5abce6fed76a2f7b964f6beed6fbdded1fe7c71bbc2405708635970455216ecc	2026-09-22 06:56:03.388
879	fd6a02f5e8f58000c64d8c034baf2eb9419928aeb65d4ca56a4337ca6a953f80	2026-09-22 16:46:06.164
889	5d34ac60ed6de9625e02b8d5e29ffc179fc879fb426601a3617ef30656843ff4	2026-09-23 02:15:36.45
898	760182931b08d51b6de71efb331e1c1cc234914bca73b2df0f7e0991a1a74e55	2026-09-23 10:28:32.336
907	1a316eee794d70a5a412845079a7b8c733298fb1cec5123d82f36ac2870f3dbe	2026-09-24 03:15:19.342
916	99cc7c67e7f2842558b0782573bfdde3fb19115351df2ac7769e6799414a0e60	2026-09-24 03:31:59.111
925	12a88ab2562ed20b68faa4269efea13a21e0c9810c51d9f4805614d5392ed3c1	2026-09-24 03:57:18.081
934	fab50b20121512ef6d82b74637a39474a4aeb38289ec91cc95747c776b37f6eb	2026-09-24 04:44:46.933
943	0d84c42ee4667668590a8b3016fa63b7d0b1963fdfc760218a8717e23c5ca723	2026-09-24 06:03:09.093
952	86f431d498db9382657c312b5af30cf68e9d414f2ca0a7410095aae7f06be31b	2026-09-24 06:47:29.359
961	3f1016de21189257a9ad9d0b190fb69f3517588cc86afa45f988307aaaed9601	2026-09-24 08:37:33.144
830	7dbfeff5c594be2a89f7ba5d732584f163a53bef37bbb62d17c352d61f6e308c	2026-09-20 16:51:02.54
839	414fa502ba7dca95d04fc709021eb510c5cd5ae415de9f9784c960f7098bbfae	2026-09-21 04:17:58.736
854	e1a15f3cb2c43fc11cc297938820efe9987bd9129d53fd9f953be9258f4e8ff2	2026-09-21 13:53:05.819
862	703750f48b383dbd6ce5a35c0a861dbba01e3307377d0f6f88a368e4b17be8b2	2026-09-22 02:39:18.173
871	1000abfac2447f8f8d4e2849116a12048ba39eeb286d6d8a9001ae8b72290650	2026-09-22 07:43:34.131
880	1e9729ad551b9a7c0557443db4fa0424194dfc4af943b50f9a9705bb5418a684	2026-09-22 21:17:38.508
890	b4dbbe571b89381fc24998c07a5f374128b91119b8e3536fbc90afd22b673ab7	2026-09-23 04:42:55.208
899	5ca56cf7fc457f202807c0a07fa7fc98cd6a50cb627b245b64fc347f850a4198	2026-09-23 11:26:08.52
908	b908fbb28e67c5048d4a512c3b7fefd1f9dfa8f09bdae54325e7ac35376a2be9	2026-09-24 03:15:51.296
917	0db019b13d8d3820045fa7c8f11b99700e25b9389b001be57bb2cc5ffa1a406c	2026-09-24 03:32:27.086
926	49cdb53f44cc0662251ecf88f3039c36d451f90c20d2664975fb8eda304561a3	2026-09-24 04:01:55.831
935	0cbd40ae051ffb60324a263713121c7c60f0fd30f6c47b90e010c27e0c342b75	2026-09-24 04:46:41.242
944	b0c3ae24996d03f80338a3a0efc7cae86669453f4c0a471b0b7fbeac634fc31d	2026-09-24 06:03:58.477
953	ad86c37e889cde18cae4fa82885c5428a6afbe6a297a71b29a198443df41da5b	2026-09-24 06:54:03.324
962	c03f9921935b8be4504a021d3e0c9d2fe553389285e17a3ea37e8af434620a48	2026-09-24 08:40:58.276
831	d5425bb1be3899cf8412620bad190ee51e06c51b09f24fc86301d867b7a92382	2026-09-20 16:53:07.221
840	c4684d1ebca2f4fe48e9d1d76dce186154e7ad181d87ba75cfb504d2ff1d16e0	2026-09-21 04:37:17.629
855	604b4f7c5dc9d9b803f37160d5b6ddf09e87eca5372982870eb9dfe52fda5470	2026-09-21 14:18:57.889
863	c231a5e3b8162dda3987d61317be59c57875bd592e23d97029f56a5ee2a7eb81	2026-09-22 02:41:33.944
872	36300ee01597f542662a0b75eb4f280edce3910c0730dac467a78b035b1e50f1	2026-09-22 11:39:14.94
881	f6260a2b8feeeff66e480f36caf3982ee8d49de49fb27cb634d51dca8ca60eb5	2026-09-22 22:42:53.451
891	40e951a2796d9240d524aec4ea41a841d36f6413d6147b51c2f42d7505655fa8	2026-09-23 05:03:42.963
900	71f2eb125057a18c29c67583dbef3827c12d296cf777f6f204e982b0db2e8a43	2026-09-23 11:40:28.89
909	f6f29a6f1fb50e28a3cab87b3f9032412a4716856dd9174977e6e8f786a218a6	2026-09-24 03:19:36.636
918	1507b605bff3624722bf47d3c76eb45c2c9207e7cc75f7e1dab85fb0030ae72c	2026-09-24 03:33:01.334
927	f31c3a9b8cc07de0c422ea0d63da9b28ea43bfaab72d5758a1d3ad335fc34a2f	2026-09-24 04:05:55.636
936	55c7591990fefb492bd26fee26e15fe06582b5f73ded5cb5d2517416149c275e	2026-09-24 04:50:33.074
945	2d358bad952a0a43d43178e09f199208bcc7debe527debd044003297736d82f8	2026-09-24 06:05:02.355
954	1b43ee45596855d7f5e20dfac56a8dfd882a4d49d1821ee793ec47127b4bc75e	2026-09-24 06:59:32.726
963	c9b31821fd53ef47f0a8fe76841432209c01472f1545e2d8f97ae4158d37520b	2026-09-24 09:10:52.924
832	51aac3a219c11da08d4815e15372a80c4f4cdb9bb6b0fe0a9dd7e8625f50bbde	2026-09-20 22:40:09.196
841	38f84edbb20f9f817cfd0e2d00a9eb8c56818b39d141f255e17ac0ccc9dd65ea	2026-09-21 08:13:08.883
864	a2f76a009aac24732f0a5ac83e39ecd2f79bf2c1d93b506c7db38091dbc456fc	2026-09-22 02:43:24.252
873	23567d45dcdf3b50728d11293ba7ee3e7b3ffced6201972c1feb6f1b6ad09d33	2026-09-22 13:07:51.657
882	cd71565f5fb9677a975746b6a4513b84127bb16937168f60e8c07f1854881f3f	2026-09-22 22:45:48.336
892	044369e610cc6eb4e4072e20074611e3093ef415e1df6828e9270b0de8f74cf4	2026-09-23 06:21:03.116
901	74475a032174e4e67ce1e2f6931020a298ba3d03cd0d317d1dc1090f8be0e9ec	2026-09-23 11:54:12.829
910	b38f7317adb50d9396e34b0111f296ffc93f513d9f7a93f72d313a289ee66382	2026-09-24 03:21:48.082
919	f5153d177e2381c75b289bcd47059eaa62604bae4d77699a9d5284c58a7d6315	2026-09-24 03:38:13.601
928	da2c643648cb7ea4e3de6dcebfea2aa9f2564956f4445a62ab9cc9714818f53e	2026-09-24 04:08:33.031
937	fffcab455234caa275d22a1aa0cc32eb3aad51e7410400f05c3ea9bb423266cc	2026-09-24 05:05:16.254
946	e9fea997eaaf4f16c368d4d8360d73307d8bbe3fad417f18e1359e3e0c095897	2026-09-24 06:05:15.18
955	a91730f0dbfddc23a0a8bc0e6027f0b3f9c5ce12528519b72949cc2fe5730912	2026-09-24 07:15:48.698
964	f2f705ba9f24c041eaea5284b844c331a2d24f2f4b622b608a84f1425aba5290	2026-09-24 09:15:40.727
969	d14c89f2876f6311d357cecdcc619c03d4416b1165df348ad459ef689b3724e9	2026-09-24 15:07:17.955
976	95955dfcf4767da077a39c1c03515a9952d3b6e3cd434b5330cf23c1bc058056	2026-09-25 05:54:41.386
970	a4763a265cee2450104ce933784351d73f7346c724b272ad89dd9b4fe6e06c1a	2026-09-24 15:33:56.572
977	a4872fb704c42d17fb34f0518d010f84cb2c39d8a669456780da79d51f1c932f	2026-09-25 06:21:08.82
971	f4a654886bde6825f1c18a45c671449a28a0892f1b8c609b2f48e14ac3b0d065	2026-09-24 22:13:11.291
978	927486bbed238bbb43564821f479b4779b3c2eaec6d82144ea1548943962f65b	2026-09-25 06:21:16.065
972	3a15e9b79e4c3f161b380e30dfde526aa3895c6fb285a988c8ef3e817b7efb88	2026-09-24 22:59:12.949
979	6b6e8511691649504783ac8649bb451ca8224fa2e5fcb669bc3d1c1581d09c08	2026-09-25 06:21:52.732
973	1033bbe825fe5365adc92273760fe29c078e8d14c825ef6ad74a0b7db99e898c	2026-09-24 23:10:33.369
974	db2c507d5c8c9a0b6098514ad33f2d196b30c6f3140d7b7e8ab6ebb00c47865a	2026-09-25 00:48:25.795
975	23d4790d15d6d209eecc6536c946427f1716d9a902f31ea5c722b189a0df0947	2026-09-25 01:22:20.789
980	a64c4b8458c9845201683d9be0929ff24a94cc40f796dd89117e653c25aa4a3e	2026-09-25 12:38:04.654
981	5eb2c36fe006ec94c2a6ccfbef9a53c7af6426eabad48395846edaa58934e0b0	2026-09-25 13:30:45.018
982	c0408e21547ffa7f1e5a6d3f32bab731033e6c6bf1db6564c7b73ac48c3f9727	2026-09-25 14:07:53.778
983	4b337ad1aa152dfd2deba0b4c81c6a2b7de799d0112c2c3cc77772b05cf42020	2026-09-25 17:14:10.308
985	31a26a2826f3a3d1606ae85b8b96967f7b1cd69782a4bf0b6e9cbcc1312bb89a	2026-09-25 23:01:40.795
991	a35578c70161d3245c763809dcbf226b362e07821aad3d548431234e91169df6	2026-09-26 00:18:14.737
997	3c7e2f2e0c23baf51f1cade9e933e1414c61e165ad9092ec04077160b249a535	2026-09-26 02:07:23.723
1003	fe5ed665817503013fdfc37fbf44920fcf0594536a56b4d4e5823f069170ceb7	2026-09-26 03:23:53.661
1009	889df6c17a331d744b8b413cc0352d6531c0887788f8fbcf2fc899e2cc19aada	2026-09-26 03:52:32.045
1015	22119ece1571dc1ea0760ef143320b9cd2dbb0963a89095d16983f0c979c73fa	2026-09-26 04:42:00.736
1021	3a1bf07ad372a96e32a407cdc17dde7a63f29e9013c0df003fbcbfb2bcfb333c	2026-09-26 05:29:46.381
1028	4cb4c935b9be02e1385a5586b57e945ba62b9268ee5e6100ab26cab6006c7360	2026-09-26 05:38:39.408
1034	7a49a1b08fa9f39aed212af7b6054646644e3d8fd0e0fc43b46cdff3e05d184c	2026-09-26 06:02:03.948
1042	403d1c0dad35ec73b976101197edf0ded84c26ae9d46722f60f1f59513bc7e59	2026-09-26 06:16:10.32
1048	4e1ebb759f2a581f5c71179cb0b6737aac36438fc691454efb159d402ab31816	2026-09-26 06:41:19.762
1054	2a25c2d7f4d55e9c759b40c2aa8becb024f254bbdc6634f43ce9b9c29b436cf3	2026-09-26 11:53:11.374
1055	714527992c8c600fb36476c471e5b9a6460feaf6745c9c7bd0c35d44c742c092	2026-09-26 14:03:38.318
1057	e18b1f27cc4c4418867edd4ae8e58be754c79ffbfe2bcbd24d4a065ac1be0e01	2026-09-26 15:02:49.781
1063	158d943399f6f392c1394fe7d678c4f80b00d78566e4560a0f11b8b8a6f25f29	2026-09-26 19:11:19.316
1069	1b81efff23a22d0d8e4696fc0bd315ed327ca1e9098da46c7515cf6a58b86635	2026-09-27 04:03:21.821
1075	1a31545920773693e9d51f136a5e0f8fc42f8e61414fbc0bb61e24f38c8315fe	2026-09-27 06:00:47.817
1081	4528b54b9fdc083759df78bb9f0e967d9e7b49e6d606ec3449430fb8edd6decf	2026-09-27 08:04:25.553
1087	9b4de8ac8677d22b4e5cfa66432bf6eb46107755e0ff2f263095c3a213b786f9	2026-09-27 10:20:15.919
1093	156f201ccbf8390083e2562255da6adf333d329baf57e21efa6890f17aece079	2026-09-27 12:45:35.882
1099	e6f9a2ab36191f3328dea8031e86e15bf5cdc888597acedf6685abc47cb369f5	2026-09-27 15:05:15.686
1105	2d244371edab80754a69a4740aa72cc9a970f668fc875a3d7e998307650f4954	2026-09-27 23:50:22.634
1111	782089c0f57a7c2f546639468a794400418e8b2b6686a2878ef4e65e9f89cd44	2026-09-28 03:32:21.293
1117	f3102cc724abe140ea2cef81fdc86309ffb5b7c43beea53961c59e0066c3b3c8	2026-09-28 06:33:06.842
1123	eef8163c2ce490acb07f5029277bbdd36a3e20c3ff92f98c1cd7a247628b5e7d	2026-09-28 09:43:11.49
1129	03ea87d8266719af7159df2e7e5072f246c03c320577f8ea3c19b40a6ac87a07	2026-09-28 16:03:43.758
1136	8ce78000694fdde5462a594e12d6217f7ac3b8625d3bcaf9da32fde71aff231e	2026-09-29 01:08:51.509
1142	ced08ec1cb986c02a45a811ae271d4eb9558660992a20698ffc012760ee8c601	2026-09-29 08:30:52.839
1144	4537877b5a41acb625c1cccb4a3978ac50a5eed7e6663c2722ca00d88cb3b7ee	2026-09-29 09:55:59.719
1145	c4880ae8efeba1918b9ef7d70e58abf3837855ab6595b84c4a4af6eaf7d904e8	2026-09-29 12:26:39.792
1151	c7b7ff11e035b0fb94b45f102be2595feb88b7acb706b6d05eb7bf02954415e3	2026-09-30 00:50:30.291
1157	a7e833f06e4376d24a66c37bbf8cbbc50d77cf1798007ff339655a9db4c9fbc9	2026-09-30 02:01:04.069
1163	777bbecc94c1b252fe5a21e6cf1020cbae698b284fd715364ee51f6d3e8f94ab	2026-09-30 05:04:40.392
1169	b2f6bdeed34b953ea09c00a9c6a5afd09f1eaab045d502fbaabfe1b84d850644	2026-09-30 13:10:45.641
1175	952d5be012960ec173999fef4a7495e13dea1d2fb3f4c62a6eea11998bc22131	2026-10-01 01:34:44.754
1181	70176d49688f221f29d5c35a4d686902ddf14096c15bdec20e8fcc407f6d7a21	2026-10-01 14:19:10.54
1187	8a6dbf577bd49211f730f4032efd44cf39b83b5c9c391428396a317e74af442c	2026-10-01 17:42:46.467
1193	bbc0ebcc263eaaa5f680172937cfc36ad3ac737124563ab658efdc9142187767	2026-10-01 22:49:03.979
1200	602d861375c1e33d7eabde4d4edd444826750775ae26720281127488604f47e1	2026-10-01 23:09:36.618
1207	163aa45e4aaede0af93d96e2e635062815316a4f4e6b9289a34a6222fe26fb41	2026-10-01 23:18:49.579
1214	c21c266f4e3285070170534db4990655d1d5eb8d49c2f844489334c79a21eaa3	2026-10-01 23:39:52.257
1220	599a0c3f3eb8a8b8bc23d4163eedf2244360872e55645fcb364a8b03807e7b92	2026-10-02 00:01:08.22
1227	0a94e94883eca560fdebfd001e906fe683d4a110dd4ffcab3f4430f26fb4d63d	2026-10-02 00:12:33.247
1234	4abc0b31363a6a20997802f2e926558243b9781e9894c08e80a1806b6a4ec704	2026-10-02 00:29:08.369
1235	2aa3d0b063f24693ca02906779b13995415abc8c9fd3889269b06e59fa2cd63a	2026-10-02 00:29:13.306
1243	8204af5ef619f818c9d532765dc5f80fb729e597303b747be54acf9971bc9d0c	2026-10-02 00:45:14.309
1249	db3fe24d431587b39d9c14808dc36f212b3afa15b116e72ca06d742648e3d19e	2026-10-02 01:06:52.316
1255	93677fe483bb42996f853d66f35d8ac10aa2b210ef83c83d2172ba95c7d3c049	2026-10-02 01:30:57.312
1261	e09b7389c98e043facd95586a608500cd0bf60f91f884f55bc4e0209cd20e325	2026-10-02 01:48:19.424
1267	0ef758c046c918a03cbad2bf49b44b370498fdae1a0ca04905e62d506d0121e9	2026-10-02 02:22:51.806
1273	2794db8c2af14fff398f5bd59af7de8cfac206894c1d48d2a63f364b2ee3a61c	2026-10-02 02:36:33.709
1279	3c838da37ea2ecdf7f50ad5764991ff59d0c1b35e3f77e709d02123b1e896f73	2026-10-02 02:49:43.384
1285	6dd42642b34e20dec87a80b01babb92f30af09ea7267472a3b2cc56053789fc4	2026-10-02 03:05:30.728
1291	dabb13ecc1904b475e6bf171c00b71aa38410c4d8f8f559c1f556772197f2456	2026-10-02 03:42:33.815
1297	0f180fc8dff4fd5781970d23056546ca9c6f7395c3bb88b1026c6d5e319e8ee0	2026-10-02 05:21:40.754
1303	98be8d72a27c2153b0e8fc71a47a2e6fbbc1634ebcb7055f886015f19a48eab5	2026-10-02 06:21:30.062
1310	78633fff093d7f64ef59a20599bf9b82fe04a8064ad8877bb4a3ed534a7b43bb	2026-10-02 08:07:47.509
1316	1d42054400d02c8a800d2cca388f1caa657ef83796edb89d01d3d6d237155bb1	2026-10-02 09:44:13.513
1322	d4107f6d9d80e895da19deb5f43056d23f58f12ffe64939e33bb90c0927e2525	2026-10-02 12:18:32.702
1323	7a09c9309cf35bfdc96b7271dce32938afb668cca033d786c4262463befa7f13	2026-10-02 12:18:36.211
1329	9bbf60d969ff9abc3e716d9e61d50abe180729018ff7d1fd4f0f3de0417d1df2	2026-10-02 14:50:03.222
1336	4b948c32780eba1c8a9e4df2a72d5d23ab8a0acdb676327f91e708b3c3159444	2026-10-02 18:31:05.38
1342	2b7f9b3de6b3d9f888b13c5674344b1148e188f3b2c8ad353d4d02a7ed41731d	2026-10-02 23:31:47.426
1348	ef75ff3893a64934c29ac5d009284c64bc0b9c05691874a597c531c08b0bc9ec	2026-10-03 09:45:46.8
1354	4e26e453a4145bc7c5874b1df1c549d74fb1b0d7ff72e6300c54c14572ff6005	2026-10-03 15:45:22.869
1360	83f201c1c71b9424b053864b33108c72935bd2d5078196afa1643743f55ab3e0	2026-10-03 20:00:23.319
1366	b77b0a69d6093c28e8f55f617102041d263f0db0d07df8fd9b7250619587471b	2026-10-04 07:45:34.71
1372	77105e3f55ab13e1651169c7c825b282810ddeb6c0dc2f79c35c769687e97cd4	2026-10-04 10:27:18.1
1378	8492d6c88f60b239c8778dbdafbb766522713b474e29588bb8a5985e13d1c6f9	2026-10-04 14:49:45.501
1384	b79d581d341644cbd4f8762c6684340827016096b6a11355dcf8b32f64754cb4	2026-10-05 01:47:03.267
984	7044e6c798d63a3fb3dd7a60a391e4896eb4e7a988b29041ec1f564571539c49	2026-09-25 17:50:51.662
986	38f6038952ee7b4d7c0c29db8063c015153bde02f68432776c378148413abb8f	2026-09-25 23:03:16.065
992	b24d4e75e1e417978a50b30cc7d7aa46aa9d9bce96edd3ccfd02421d1370f5ea	2026-09-26 00:31:39.508
998	0620479208128527e07af81324178156225fd179bc7bffb42aa5a6095203db05	2026-09-26 02:19:51.074
1004	bae62ecbdce008cf011d460b2b2346a15d2cb922225e89f7ba427101e9777d36	2026-09-26 03:27:43.776
1010	b9e9018d3030a6850ce75e2c7835ef944da9ccbc070411d13d5a32f5622d1293	2026-09-26 04:01:57.198
1016	49161a6fda1801fd18f2fabf0cb0b5e86c560d502d20a0d94ffa5f26daa994dd	2026-09-26 04:54:51.495
1022	b42b4f3ac42ffa578276ed5cb5696a1c48d2917cc7171a27636985fef75f6f3c	2026-09-26 05:30:04.49
1029	af2505eaa7bad82036e29a79619f5fdb724c64673a423f8867f67c62d4d6e21a	2026-09-26 05:40:21.882
1035	8c39704eeaaa07a72fbdb0ad737164a849ac6d2d46a982b055d66162a39a7977	2026-09-26 06:05:26.158
1043	f169b03ef796717392500b934b31761097c2fbdc437966a362832bb4465184f0	2026-09-26 06:16:39.584
1049	260477d070fc122cfd9557c86d30232dcb57e6980c349f67f90f924104bf3b5d	2026-09-26 07:26:32.74
1056	e28f057b2ecfcc76c962d6c1773f95d5dcbca7cfda52dccdcbd658fb520d2114	2026-09-26 14:22:53.484
1058	06fa2f1c349f0bec11d5311baa3790458b983da023a6b9a4e8f2cf9001427543	2026-09-26 15:03:19.48
1064	aad843ea6809e35ddf4a9e7a589c07625ec900f03042f5a0a3e0330f94527177	2026-09-26 20:34:41.065
1070	a6cd38d9395e65ab7564729da009e502ea354f0a7ca67f6b7d20b043bb9b9568	2026-09-27 04:52:35.647
1076	47157a6c6ba96c4b64759e91e98c966282fe07cc9a65b11ec1c7ae06cbc00cf6	2026-09-27 06:04:35.297
1082	80f649a39ae003ab90da4dad5e84c1b25dd960f3ecdc0c5551386dcfd1e2e212	2026-09-27 08:25:58.797
1088	56033978f90704717dac8d4fe26316ee09c6a9b6d511e063955c21a7484fe6f9	2026-09-27 12:29:43.333
1094	9f2d9c3740054055fd8b0eb1474641eda170e1025927af1b68ba4dc4cbdd55d3	2026-09-27 12:50:43.551
1100	69d864197022412e690f86e60b64d805dadd62dadf49e058fee040d67fdf0f4d	2026-09-27 16:30:46.506
1106	adede1bcfc8f96ecd3f2ab58006061e0713476aa4317302765e5c6c2fb7b41b9	2026-09-28 00:11:45.209
1112	c67eadc4484e7092017be03795c823d0a7b6a5055afbaca08beb240150cfa129	2026-09-28 03:35:43.166
1118	d757771f9a8fc102332ef8c3ef7967375ff95bb45f16ed37ecf55ee4e7361b4e	2026-09-28 07:40:42.147
1124	d99aa4a2c745a1f529ccb7cc193ad6b93f4402f30a127967d2d2077427b39d6a	2026-09-28 10:13:13.387
1130	bb2776a4b5c8d2e738d3f05a55b24f6ba7cefb8bfe266b74b13ee0b1ecd7dac6	2026-09-28 16:24:26.341
1137	d31da1cf0cd927ce55948f462ebc72ccbc0821312b8d7769db74529690866f2c	2026-09-29 04:03:21.41
1143	3bb25b5e5cc1b0fdcb1dc09b0251c38bc1b3a9aa398e9087978f891011009ba7	2026-09-29 08:42:03.24
1146	b196cd827cb52d12e10c4a28333d3ca90c9b6dc433d08d72d4dd636556a15c1a	2026-09-29 23:59:34.685
1152	c146b0b94c38ceef3ba72941ff8659671316871e76b9d968f173e39571a89662	2026-09-30 01:00:00.965
1158	6e745a7c6d41083a6b90afa1048bf3b7b9ecaaad9245910a2dc2a2f141b560ee	2026-09-30 02:16:01.265
1164	f1bf8a1e434f65a115fc845602a44c631ce3bd19c8e5f2c1cf886dfa4b070401	2026-09-30 05:21:35.221
1170	6bf35c96dba8a734bcb52e3fc44e0403727d3f5d7f1bc0103efee717ca7ab53f	2026-09-30 13:58:59.105
1176	403853b2b5733ae106466346dce1f2e7a1f90685afa07f4852ce7d74cff377b4	2026-10-01 02:58:50.172
1182	396782f57a0a4afc8d18c007fb7ea4a5ba228d80511653423f5cb34ed150b3cc	2026-10-01 14:59:28.682
1188	fee7f14fe1d8ba63b3aea374893e2533f5b8f3cd0a0461eb2694ead544a39042	2026-10-01 22:07:54.092
1194	0f3d1bd4c469a95589872c24c564ff8a1be063f1c7a2ffeb762f7bdcca6bb61f	2026-10-01 22:51:09.58
1195	d4d3cc8e37c56ec36be57e5a5f920b86f7d16c96f05a8ebc439f5296119c065e	2026-10-01 22:51:15.427
1201	28d9b8236875a3d09baa9e0330014238f298470067e28b0f661b5a8bdb252929	2026-10-01 23:11:57.477
1208	fa2775d5a8adfe043ad095ef572629b7059fb00f3a336ac58e06d56d9c1a8c1b	2026-10-01 23:19:01.418
1215	5a1fccdd235608d4da1b806d261a723ab2e361a9c00c63928429428402a3af68	2026-10-01 23:43:53.341
1221	04929693a5925b9f616524c94d1b495f1c570f59b8ced2759de52153a105dbc5	2026-10-02 00:06:45.587
1222	02232e7bfbd11be80021261119d209649134c98298d275d95e819fb69689fff4	2026-10-02 00:06:49.358
1228	49318a3f6774f2472ba45fd4bbb05124622f45fee0802ebac10f70b8a15dec4d	2026-10-02 00:15:48.38
1236	7bd666a4e51ecd6cbb9f8d8c74aaddb4d1a43ba78f004704139093f542d66d2e	2026-10-02 00:30:05.115
1244	c0e3749c09a5f01db54cf57cda0db4306dcde666df4ff68a5b26625983de93a8	2026-10-02 00:52:22.578
1250	9d4efd8e00598f173040ff7968ca1af2660601fc6753b365d41aa2d1e9a75eb1	2026-10-02 01:07:09.139
1256	33859ad80e589b8bf016e51c6b31d497bc2da2f70cf8b4218f42de1840e555b1	2026-10-02 01:35:14.073
1262	6f34d7b08d32a5e3c81c757a46b809020067a4a671b374f6ba4376a30bd70b8f	2026-10-02 01:51:37.748
1268	dbb7c5c1faa7e6b1727d43be3a052ee627964624143a341cd1efc44704a9b2d7	2026-10-02 02:23:12.02
1274	f17350567a8be257bcc00c6a044d9469db716cdd5cfaead703c75bcec41a3202	2026-10-02 02:43:43.728
1280	f7501765ae58b1a826102616f8c3926b05b7e42343e0653acbfa493c89170881	2026-10-02 02:57:36.182
1286	1cea0492ad93f4755de10494e2e4517e0fb658ec82d63860cf4ba22181d8027e	2026-10-02 03:08:19.357
1292	a634b835e478ae0e02d8dbc0a465a7c8b21c918e12ff0afb2b8b4473524c3408	2026-10-02 04:06:36.561
1298	1eae400452a2852cc5a1526f65b7a1f627ae8c9f7128a97f6755366dd5459dc7	2026-10-02 05:48:54.577
1304	8e224f6465342578d64925b9c4ac5722d927c37acdb0c37dfbf676e83efc87cd	2026-10-02 06:27:36.821
1311	3f99b0c60c625403ed75b5c6aa287b4fde52825b319831a8d146ae8df7e2ec70	2026-10-02 08:36:39.423
1317	26b039098c45d9f32b2755f1b013c944218b70943569e48eebe6339494349a2a	2026-10-02 10:01:49.793
1324	aa34e617c76130d8d687f28edecb4b2c064dcb56aed87b1d11d884e011bc0028	2026-10-02 12:36:23.972
1330	778715378b368b14b456ce0840df7338425fee8b557d3bd92118af78a79c7be1	2026-10-02 15:51:30.123
1331	b692438f3b6f82d1af463ece8867da7fe1be5dd70ab2335dabb1b38683000406	2026-10-02 15:51:33.316
1337	e99357208da9098036aef50305ed4ffebfe88aef6af8da0a4aa1cc5bdf8c67e8	2026-10-02 19:37:43.742
1343	38a26c718074212c59fc430bf6048938b70b2c61dc434756c663c8e7f10b3c4e	2026-10-03 00:39:32.159
1349	65c7c8320929c1655f079d2dd75a4901d748c7d543ea374c40e30f2372ff6669	2026-10-03 11:23:35.398
1355	4bbf92176c1620d142081056e4a0f51c6d3b3180247f9331aa3a0e9afefc1e41	2026-10-03 15:46:22.63
1361	3b7f163e6107f58dd8852199ede7b37ff8fde11eaf7f40a3fcd596e7440165f5	2026-10-03 23:19:10.375
1367	090ba8d5ef5a602f0347059b52d919bef6a96cad06b84165fa9bae44bdbccf9d	2026-10-04 08:44:08.312
1373	c523d842107fee94ef86ef4bd6c60359ee7ee6e65e99cc4e2cafb05bff37f0a6	2026-10-04 10:32:15.512
1379	fbf649da69fa64edbd2bc498ec79971dd8c679040d20b67eb4e7e328e09e5ac8	2026-10-04 15:00:08.654
1385	c62ce9baf6b98cf2b0e981baf6c0ef92b41715f109d34992f5da3b41427cd7a7	2026-10-05 01:47:16.042
987	a524a5549eef27bcc52eea5ca0623fbcc2dd2ce00919693173dac8b2e252855d	2026-09-25 23:04:53.989
993	1e2f155473f48916e2baaaa526ad5c210aae906c73df20e5279316e904d12a89	2026-09-26 00:54:46.541
999	8a92270b744e0fa1c6821d61e9facd31949f8396a0d9a2669b9b18a529f95800	2026-09-26 02:32:21.335
1005	a0df7504050e5ddbccecb52464b7330adc6dd288a86d23f9c2fb4e736617aef5	2026-09-26 03:32:21.225
1011	9588c248395570edb720a4c0c0785c5de0321df98aa1232e87de976528917a91	2026-09-26 04:19:23.555
1017	4a764a06996d8ea3aa7e08c7368c49da79d4591b0e39816ed826b44b28e85e70	2026-09-26 05:02:09.283
1023	f8b14c6abaa3131301bf7e8b8e0f2e769ebc546505ae326808009ffe79a2eb0f	2026-09-26 05:30:18.385
1030	d47619fe7e9e67b5c32c5e35fb01a7f895903d35d75b801e0bf384e387aadd59	2026-09-26 05:49:45.257
1036	a744c6a4effbd24476dd72a5e604447aa33ae040ee1df9a4946f857a998fd67d	2026-09-26 06:09:31.262
1044	355c6045a7b79d2eaac0cf1b6bde3961419d98c1a4589b59fb4559e765d0d597	2026-09-26 06:18:33.547
1050	0ee13a6807126828713b23d3baf848340e289278f835a38c015b3cae715f42b6	2026-09-26 07:38:08.254
1059	ed228955eec33f2f91ca24c5ead24c7f422e36db34af91064ba5412595f39ed5	2026-09-26 15:39:02.214
1065	b4994cef138338c674318516791616ea9641b0936415d2784f3dd3312d9f65f1	2026-09-26 22:47:32.351
1071	802c2d862971d2bb947de92349f111fd8ec800a448065f2f51ee9e24e214f1a0	2026-09-27 05:39:29.31
1077	d8bccd1350ffa0d85dee329f6238c83ab5996813179b59a71db7dc89dac31072	2026-09-27 06:12:51.94
1083	e2b12798103864d42739e52fd9425d7a3789d8e1e5e26f325b1f5cde4cd86b23	2026-09-27 08:44:21.035
1089	a9ff0b15aa5fb6fd575260e15b50a4b02d39564f20733caa75e395f18992a1cf	2026-09-27 12:35:00.879
1095	70280db381d0f00e5550811f9ed9a8935d1fa0a4d56d1dd82d42bc3d2c3ff3b5	2026-09-27 13:07:32.506
1101	1f571b7b421f7caeb75acb99333184f32647516536656cc914ab3e4fe671d5fa	2026-09-27 16:51:24.937
1107	b54cfb38f6172fda7595ebcae4400245f87bea2f92ddb7f2d885df8296419ad6	2026-09-28 02:28:16.203
1113	9f550275d6d48abf7363b830fc125371a6829c224e4035fe5372c54bd9aac37c	2026-09-28 04:27:42.049
1119	23224c4bd4f5b25fc00c6814a39900d682586e072dfe559366118a63d0175efc	2026-09-28 07:40:45.919
1125	13b9abfc9acc8bb5bb1e77e8a98ab631eeae6c244003a5b6954df702d0255140	2026-09-28 11:23:38.819
1131	f5674a38dcdf333ec9656769195379a53ab99a3309123679da176ab2bbfb2c7d	2026-09-28 20:11:19.624
1138	13a410f7b94ce9a63b1ef01c316fb2306fc5dfea35a4653f2c11e5dbf6e95d3a	2026-09-29 04:17:42.81
1147	cf9e9cf1bc2623b2a4a6d2c37f8e472a14362b1338fb3912f64aa349cbd23321	2026-09-30 00:05:16.304
1153	20cc24c65583dc0864d30e85b6f290fa9391f15b7dc71a5eb0d0c923f2f49252	2026-09-30 01:05:52.123
1159	341d996595fcdfdab9e4df7431567be77e52c4d0617ec8767fa62d662302f243	2026-09-30 02:30:03.379
1165	083a88ef978c11d7a948f99999bbaabcd32f0673321cb94f24e65d8ca157a118	2026-09-30 05:51:13.578
1171	93a22921e41f582e58215d6493f68fb285a7ccc17fa8f43e15dd1cd01a903042	2026-09-30 15:05:47.847
1177	65cd073e14a0cc923e11956e1a7ee0489f85e3c46366b9486072e409a0de3919	2026-10-01 03:20:44.534
1183	768f2466ca74ff04c066114d0a2f07d0a69052ffa23cc4382c76e2d19722c824	2026-10-01 15:47:41.774
1189	9ec20119d85095875860e91a8c8d4035919ee68d82efeea945d50538eaa1f8ce	2026-10-01 22:10:35.602
1196	ef44a5124e19fa4ff51c78493b0bdbb5f075a392e3e53a0907fa6fd95b7ba995	2026-10-01 22:51:27.623
1202	3262d6032708c1ae9cc6118c107b670eb73fe4b3735fc053ed8c5cc308f05166	2026-10-01 23:14:24.039
1209	1b60eba9ff8e02480a35349a1379c1fb62ace14b169c987a6b5b2ac3342f63ea	2026-10-01 23:24:35.843
1216	43cb63b853a6b017e558cb45c8281e51df2fa75e44897db122a77e73cb9600b1	2026-10-01 23:43:57.922
1223	bb56c549caa6cda44fb44c2faf40c047aec5a0321dda3b424ea209190fd39105	2026-10-02 00:08:08.298
1229	996eb0b1f15f325ce4ba262eb9101214f5115785f77def2778f3513fad85807b	2026-10-02 00:18:51.735
1237	154637815c413e022bfa294f3e2a37434ffa5921358668883a14ad2c57739f32	2026-10-02 00:30:32.671
1245	73f89f8af519fd64cf555cf53a33023dad34725e591b3aea38aefaf0f810ba1e	2026-10-02 00:55:25.606
1251	4abc101820c1649be4d6089b27a3aa9d709fe13cdfebb3b8b761cf5cd03005f3	2026-10-02 01:08:08.365
1257	ac1703a5ffc871bb8e53ddb4f462bf116a0bd5f0f333b3bb22350902d94cfa17	2026-10-02 01:42:35.176
1263	7ac5062fa35a89400040e1ca524594ee7eea17026db66cb8c3694aef0b258a30	2026-10-02 02:01:40.676
1269	830ad511bf65bb9ec1f5db388b9e0c7d1e2614c0e37ae3d2c187f756b48a6404	2026-10-02 02:23:44.616
1275	6eafcda87ffd87f5a7f4d06ec216f4d64929492d0014fc3bba20585489e6060b	2026-10-02 02:44:09.786
1281	dd011ff13ea6e9311fb29fbf89cf47010674ccedb0fc3c52d7b3225ca04896b7	2026-10-02 03:00:13.002
1287	88e2a87acb4c5df69b781e8f85bec643727808a68d9c15d2bc1fd95323511440	2026-10-02 03:12:47.573
1293	989c008e12ad76e1fdeaa831e38bd66dec2bd8d0ffb3daf5d276d4b208faf17b	2026-10-02 04:19:12.097
1299	775ac4c4c92a075563a9e3e7c58da31c75b83a726ed7f15a350501cfbf17785c	2026-10-02 05:58:06.077
1305	6e396c377f1b2e2ae69ce012d5f1db0eda0e11d2eaa6ca1ae1bc31782c6331e3	2026-10-02 06:35:40.235
1312	3bf18df7dad958100cd57bf938b172de6ec36e10341a4312ce0d8f2ef7122a4a	2026-10-02 08:44:39.711
1318	e1092ba97bf17ae3a42522790a4464c3ec04dc05a7754356a1df0325417d6703	2026-10-02 10:45:19.947
1325	8c9ae3bee465eadf6a828534b39f105d23cad1e9a43d784d12f77fded648f1f4	2026-10-02 12:37:15.172
1332	dfc56f6779ba3ff06c61ca1cf1a365c16167c70ca952ed12f7918b526340b127	2026-10-02 16:33:27.055
1338	e9a0c57c0f785f43f04a800303303f353a5b189ef858d4cb86f0715ef602624e	2026-10-02 21:26:24.932
1344	0e1cf8e68a61e5b44cec3d0e2162a72767d6acb1b54a1df199fefb0827654af2	2026-10-03 01:47:51.873
1350	febf9464e4ca5fdbc85a84f2cabad9d5fffbb01c38a23e8816beb6735cc70aa6	2026-10-03 11:33:06.308
1356	3b17ca08980d4d3badb330451becfb117ce06d15012268ca6cf19b58430eedad	2026-10-03 16:11:57.838
1362	b0617481ac636b35a0ee6fba8b9f98cb57a26635d5872935cba3a2c7118bb3af	2026-10-03 23:19:36.536
1368	38faf2ac9530a9efe2a6b35df0dbf730b5d96c04c53754bb23a8a7cb46575b06	2026-10-04 10:16:21.012
1374	8ddf6c2be65d8f99cb3aededcb2ea3d0def0a465e2e7a122d3d5d39b393105e4	2026-10-04 11:29:20.786
1380	e492f83ba1eaf21edba50f91ffebaa269100afc5f63cd477a35126a5fbcce183	2026-10-04 15:29:54.312
1386	de7f6c079a222269500eec3111b73abc9c616e9cf0d34fb63f5b766b1310ce15	2026-10-05 02:16:36.942
988	0bcec591086999a90e155546b512c99e2a73a0345369658fcc02894b26130abe	2026-09-25 23:15:00.764
994	c110bee54ba6ad4d16f31ef8ed15b3184debc2ed4863241c737664ca42071c31	2026-09-26 00:57:28.682
1000	37196f199c34c676872f8f0b870cc69f6c50ba800f09f420628e3cfe832ef338	2026-09-26 02:46:53.12
1006	8d55ec916105c3cf88c457512b71475b75c2fda00eb81b8295499b7ba6ab6748	2026-09-26 03:32:49.419
1012	3f930fc33d4d336ace00955516cfb97cd8fdc4bab34d26f8cd885bea81ee646a	2026-09-26 04:21:03.212
1018	afa3b69583271f50a579577262a5dab523e45511f4cfde10c057e040d896a7a9	2026-09-26 05:19:24.205
1024	d3d3858023cc4de86d5c037df1d7183c4be57fded586cc2db472f95ba21cf805	2026-09-26 05:36:30.094
1031	3f11af385362090049b4e0ea1dd700edfccd6337016123ed86c23637efd020ca	2026-09-26 05:53:29.214
1037	09cb72d0a978ae65b2c6b8f412458e825ad27101ff3eb02f506acc37f772d37f	2026-09-26 06:13:10.788
1038	6dc9a3b8a0864485aefbfdd2411ff7ed82a14ca60d1617387ec4c38ccbd67534	2026-09-26 06:13:29.137
1039	8b95482b90de89d1db89e6e57c65867e712482cb196efa105eb7912a2e0f4272	2026-09-26 06:13:29.576
1045	d3a53638cb072ac80395d8a22139cebf61e6942502ef0a012d15e47cfdde6986	2026-09-26 06:18:59.131
1051	e4ceb4299de4285707e47fd0eb2a49886079ff5315e49b9b1a310e42540a9309	2026-09-26 07:40:44.326
1060	6d997981e95c5bc02c69348381aa0b3948199d6b779b5ceff5321596f94c4dec	2026-09-26 16:13:27.689
1066	f5665d28a75c8f298fd33cc56fac4006a31f573e7779ee3c57f10c62e0fc8bff	2026-09-27 00:19:30.145
1072	3ecc27dc35610d80990b5e7dac762f9ad89e8beb46bbc6f9657944744969d102	2026-09-27 05:46:01.787
1078	b2a04f8a63163a6c663b3b735d743605f6695de8098d46a97d57fee7b5fc4891	2026-09-27 06:18:52.166
1084	9c9ac0733b3f87202b4838209319debd58241c4c6c83ceca5da82b826e4c68cd	2026-09-27 09:30:16.643
1090	c6f643fdd5ce77ef3eab61362ccfbb42f40defc03377009071517bcf34d8a2d1	2026-09-27 12:41:37.171
1096	7bd17216d4c6a0d7b8ed9019bbbe9fb2d8f95f555d9d3bdd856b674b2de28116	2026-09-27 13:08:31.59
1102	b6b8850139802dbad1f58153b9184c4f2b73c866f86eb6f4abf81db748a5aec6	2026-09-27 17:04:51.77
1108	3c9e313273d11623269bb3522f893df358917ffb4fdaccd57411decc7b06b984	2026-09-28 02:33:49.597
1114	27c626674f099cecdc13e8c45dfac594e68dbc2adfd590cb49872c077e367422	2026-09-28 04:30:26.421
1120	fe9bc696045895a51f73a4a4d47fc0ab01e261787207d0b9188fdf5efe90970f	2026-09-28 08:34:49.339
1126	8a644ddd49e97abb30d8a032055c1d172013617e9cfd00692caa7b1036a01ec5	2026-09-28 13:58:06.543
1132	f5eb0c97c008188866e4d94ba04abca28ebf4c83544be49b7e974cb2d64cf557	2026-09-28 22:31:48.996
1139	e88b247799da0c9773ae0ef90be78552f9cd0deb2a18deb8f3b8e0743ede3d79	2026-09-29 05:01:10.269
1148	76ef56aab7096b8ae0cf7b0a9c8ea9230494419e3ada9ef9d58aef7595181080	2026-09-30 00:09:52.727
1154	11c01bc5db9cc84b3b0e815ec051991152cde0325a50c6bc882dd03718281006	2026-09-30 01:19:04.458
1160	432682ca90db73a363c698026186503c56676083621382fc704d8b91ec152dfd	2026-09-30 02:34:39.354
1166	cbd0ce4c008c1e20e27f8c8b687d1145128fee6e23b04ec91b2c86a4bb0c3b0c	2026-09-30 07:07:43.436
1172	040e9f82dab6a85edb860eb666ed6185b70db2709c725dd80e083a5c8708780a	2026-09-30 23:56:51.413
1178	ca11c8a90c42af85b140e1d92578b1679dab0035bdc080d8a325932ea51b5d2c	2026-10-01 03:22:15.309
1184	374240f73b098bdd28b6df33fdb87980176270ae292eb20950912cd7f9513ddc	2026-10-01 15:47:45.192
1190	a0ff3a8a9f70f2629d8a4be8bd0e39088a497899158d36570f31a52d1db240fb	2026-10-01 22:23:48.494
1197	26faaf0183d1264423acb0ff2628c519252929d5ca181c88bb47935308b31566	2026-10-01 22:52:22.536
1203	438c22b667c15b1434037cfc9f9e2a28da0bf2f607805a3449a5f9a505c05233	2026-10-01 23:14:57.488
1210	ee5a99d844f82385443468fc65cb424361de9979f23d92afb8097658cee8e2e7	2026-10-01 23:28:17.016
1217	d495daf0d58bb26a290253a8675cd29dd269562fbf9c5ad95453d3d2a6e95c47	2026-10-01 23:44:14.719
1224	116e63d82a10089802d53307d09ac566df2397797bb7645ff4c6f49767ac7f3a	2026-10-02 00:08:43.938
1230	c3df88733ae37dbe78691d56823d4f2beb3bf2e1c44a15057907c3db0727ecf0	2026-10-02 00:22:06.194
1238	7320ed06670b890da5281b9c9a2000cdab6bf13e6b201b9ca2aeb2fdd6496244	2026-10-02 00:36:02.92
1246	69eda7ed8dee05bf9ebda1df9342cd6c035cacabb94b3307888396191884137c	2026-10-02 00:57:04.259
1252	5e19d3ec8a2a4addc18eed1e314e043a655d055404d1904f07f7c1bb319ec409	2026-10-02 01:15:00.366
1258	88d31de0d227446d81b8e71a377b3de03f8599bddb8a68c1873904ec486b0c70	2026-10-02 01:42:37.888
1264	8b77da08e40f20ab902d6648b86f858f261072d65f2bf3af5a9372b27f521bb7	2026-10-02 02:02:43.053
1270	e79b24936053310103670367f259aaf8193fa0f61e11f6569fdc5537df45544b	2026-10-02 02:24:42.785
1276	5df1aa403ca34c20c2794e9715681c17571ba0ecf4e4feb1aa4febd8317bc255	2026-10-02 02:47:44.303
1282	099e25bccebeca8d1ce5d8515b08f439790d5e81c4d1c8acd68b8904f7044e04	2026-10-02 03:01:55.143
1288	5e7bda04c81fc80937fc605c8ffdd2bc208549832c3f4c64a19734622417451a	2026-10-02 03:18:33.79
1294	e906a88a44cbe149c7225992b72eca0b607f70f7e61a5f555c537e8adfe60374	2026-10-02 04:49:18.072
1300	e9eea41280ba74b76028d475d670d854475b9ef1af38098b75402725f2d51e3a	2026-10-02 06:15:09.448
1306	abad345b59b8108aad80b476c8fdab9a5dbc46dba907d7cf43e094e954c4fb7d	2026-10-02 07:13:07.583
1313	0656160819e0c417f1c26471a70310e3ec1b20e09363008a21bc92209ebc4f42	2026-10-02 08:49:45.844
1319	a83e42f95c9f3a98c8cbf3e0accbec85774e578f0b16eb596c17bd97a1a9a529	2026-10-02 11:01:43.221
1326	6dc4d7b2caa761d727e7817353109ba25787809ab200f1503b41304d94f3785f	2026-10-02 13:16:11.856
1333	7dcc7650cb7f59554e9507857b1e27807fe1663ebae92e78117e58818be99110	2026-10-02 17:06:54.93
1339	fec40844932e54ebf7e08facb8d5d0bd84c0c7515dbc46d8240403c09236577d	2026-10-02 21:58:32.878
1345	9a32f7ef0ac21cbb4e76940db6b28da2a0fd685da5b87592711f3432d1f7a6f2	2026-10-03 03:32:44.643
1351	c9b965eb1094e8c7db83c9ee00c88138637bcdc8d5547a82d9c8963b2f9152d0	2026-10-03 12:08:16.848
1357	f5f8400ff5c811f229815cb8bf09fd035f31723d484a08181090106b232d5288	2026-10-03 16:47:15.422
1363	0f74c21fac41ba2815108412008adb320aeda75a95295e2ff2f777f4427cc865	2026-10-03 23:20:10.807
1369	05a3d4b9efeceab8f7bda93784f30fd8e22fcca79eb8e0d95e69e516273a5c2e	2026-10-04 10:21:25.763
1375	91dd899946223e9fd98847e95570ef9df233dcf1db2d4ba8552b98798efa9ce9	2026-10-04 12:42:35.644
1381	ccc2280fafebf370a04a57f5159cad6c3c718fc1cfa14fa958b3aeac4b443a8a	2026-10-04 15:30:10.894
1387	a155b01fbc6b4b32606d34e8010857dc9e1e272b1fafe075f84d0b6b46a1c4bd	2026-10-05 02:34:42.368
989	906fe6bcb03742755c0aaeaa84e5b8c9c0faba04c0b2bc5647e880a1fb24608b	2026-09-25 23:22:56.359
995	4a14dac8d0e57b32da9df5e609184d5b9d649082621f124b36f08e4def46406e	2026-09-26 01:27:37.129
1001	0dbd2af6240e9e8f66dbbad455c63a3672f74dd46b48a5f43f4ba12ee01db1d5	2026-09-26 03:21:31.99
1007	cbbbbd34c696c3abfbdc77c469ea6a2d925703da7f1c554965f0d6a7c14bd62a	2026-09-26 03:38:07.554
1013	18eec9fe8c1397b3e9b5596c64e2913a5e2246662978e41e9edd975a6fa998e5	2026-09-26 04:28:34.491
1019	9b64750b2760a3873c192938d524c048102a752ecfc2397cbe3f02e8f9f1a94a	2026-09-26 05:24:47.8
1025	c4ff95779e7f6192c7f391802488f9a82fc4746d5370f8a913e345b7cbbbca71	2026-09-26 05:36:43.148
1032	bdfa14775303c816c0ee3ee05b4514630a093972e7a9653c4bacf82716851403	2026-09-26 05:53:52.262
1040	fc72e782f6af781129763b8b0a4764bb43aaad2623af158cf0e00f0e57c38ce3	2026-09-26 06:14:40.687
1046	c7528756ce7ecba3f29e7927e97f7b80cfa1acb50d6d5e33426fafc0dea8cbae	2026-09-26 06:23:23.944
1052	42d64603fe936aa3bd9d36fb69b527cbcc3fc1d9c1e1c140b4789e3e5c946ad8	2026-09-26 10:27:57.656
1061	32a89134df7fa6d94fcb98e1dbbc71e8a513c23d6f8e8d4fdf94243ea9554d77	2026-09-26 17:30:49.412
1067	1e8b561d3b7de8134094722a526defc5252c8326cccfd935b02b4db0bd1b54ee	2026-09-27 01:19:35.966
1073	3c0d81a694a0f18444eea927acde2180c05a088fd0e36fa4366429c743f09101	2026-09-27 05:46:37.803
1079	4417328dc0eb52df3a745841209e1781dda101a8e8206400e7aee26bd1b5871b	2026-09-27 06:26:23.323
1085	4d32117aed704f207b62c8e03bf1858b4d772e707d935b860b9568b990e6d81f	2026-09-27 09:46:32.907
1091	493efc4b450b3359ac01aa638155959de5222b6ebdb51122115e6768bc2d8d52	2026-09-27 12:43:57.814
1097	9621ea533f06f93c3866a73a526b3d5346ff53423e7c5f06b9464f9f6b05757d	2026-09-27 13:30:21.239
1103	6275b58d969ea678fb4ed37e8fd8d60e0f22c11b14392d87442d7e936fc45cf8	2026-09-27 22:20:13.473
1109	ea77160b570e9f249a10bd85bf28257270e8c3bcb9f161f98284a612a24f1fde	2026-09-28 03:26:35.917
1115	e456814d8b21dff765795f98dcfd26b1ee4baabb5d2ebe0969d7033707473550	2026-09-28 05:01:42.634
1121	fe4edeb7cb52cdb48c70a6d25a5ecbcde55705eb791d6202696ea02349c366b1	2026-09-28 08:36:25.446
1127	38999c72d7b364b1978cf98c76f5c92de3655c79c9ff31ae28fb4c833398b9dd	2026-09-28 14:17:42.986
1133	97775dd2dcf92eec983fbe3c31e732bd3dcbe09ba3d1fce208be147cf7212ac4	2026-09-28 22:33:59.033
1140	20d186d2302626d9403dc9bb49ddeed743f28edcfa7d51fcba7573889626f815	2026-09-29 05:24:32.836
1149	d185c6700380dfec896bded02d0c6e196b2e441287048be854b2fa653849c0e7	2026-09-30 00:34:42.46
1155	51460eb71327a1f53eb8ff26a52acafbae984eaac8067ee39deeb8e8ee678e8a	2026-09-30 01:53:43.286
1161	8d410818a049322e3378f9e4e3db8cf0cad101bfb4bb95992269ec47d49b555e	2026-09-30 03:04:54.471
1167	fc402694c0ed0b451ed52ba53d14e1e4163128d3c035e317249cb9ae27f0cacf	2026-09-30 07:21:41.549
1173	2a2e7dd37b694a84f3f9b669e712f35b217ae1eaf85d6ecf5ef2a0dfb73d56ee	2026-10-01 00:38:15.994
1179	adaa394b782f811d46f1d3109bfbf3ee4094c13f316c2335f768fe4bdd53593e	2026-10-01 07:06:13.837
1185	c619d848d9e6617f6806f02ce17af40e9fb49579d63de1d1610c9e76b89eea1b	2026-10-01 16:05:34.714
1191	3d78a9c891d16f39fb1f6469f79acaeff77dff7992c9019edd002eab7fa1c1f0	2026-10-01 22:26:53.85
1198	183e93f9ff55ca5f9ac62b8eff12a0327733114b210d85df14d869191f13aa68	2026-10-01 22:54:28.841
1204	c67b8cbaaa8ba9f7a04bc0d42ce4b618c985506113df01113cc20dfb7ee82930	2026-10-01 23:15:23.212
1205	4f4e635cdf44def60c43b1b266647cf3db70370bfb5cc6263c6ee6688a803075	2026-10-01 23:15:23.404
1211	f22d97427563a8bfce8a40dd0528da7e895b9970dcc850f8f3084dfb47d3a9d3	2026-10-01 23:33:35.817
1218	4841d10410ad2577cc665c9801153a2725813454310e0e7fcde25e9cf56422af	2026-10-01 23:47:38.162
1225	1e600d1da05ddeb795102457ac99ebcd720b5e2c526be19597ad52e5ae79accf	2026-10-02 00:08:55.66
1231	1bdd19338f89872069e6a451028d38fba914e52de5e425a17b77971901bde637	2026-10-02 00:26:42.569
1232	c854f09da7d890c52d7761ee415a7aca8bda5af6c5476b482ee915e08bae7413	2026-10-02 00:26:44.444
1239	0331f7bcb91ed0bbef6b1a52bad351b5516015a874d67befc8bd082eb2c5f1e8	2026-10-02 00:43:04.977
1240	dbc4b5a8a7f90176353a78ee8bcb8cfdf0d97271954d485be223ba7740f18043	2026-10-02 00:43:07.721
1241	ba3325f4d5e199307db67567576012837d7d3ef147af28a127da5a70ea8bba2a	2026-10-02 00:43:16.633
1247	e4c2d44a6ac9f31c7f2609a30207e27c3cd568012e1e6473ab39ec36af754963	2026-10-02 00:58:25.658
1253	4cda07048ecc78189be59fe49f724b48f12c3add5536240b0c2743ccffaa93a7	2026-10-02 01:23:07.998
1259	61394bf65e4ea5571fd52bdff5d5af3635215fd52a2d9b3b434e2c9ca6244b08	2026-10-02 01:44:35.987
1265	19d7e817482ec18a99f969adf6a198d5053c91e9066284a8602760010b72bd25	2026-10-02 02:03:24.292
1271	b7dded1fc4f3326740627c769aaa50feba4e078a35f66623ff8a69dc1f8db874	2026-10-02 02:28:47.754
1277	9e43a0bec7888e11bab2740dd0fd5d405e8f9fbb183512631a22ec3d3caa12f9	2026-10-02 02:48:27.838
1283	5dfd25128c2bba3af400fc08e293bc00add672fd1f63e35429905dc373ddb017	2026-10-02 03:04:21.369
1289	06606be3e7dcc45f334e710e9654617ae03b01b50742bdc1ae380e1605bfaee0	2026-10-02 03:30:33.521
1295	466dd843aa474287b83d74ead60766614d33a1ba7ecd6d36fe2bac3b8f652ee1	2026-10-02 04:55:27.537
1301	dc60b1b5e82284ce5d93b94d77f9598787a58ee26aee2d39cba1ece0fad0524c	2026-10-02 06:15:43.908
1307	52860a70383183641c7ba578c05ab26efa4168d14e76851c755fc1df29e91fdf	2026-10-02 07:37:56.466
1308	a79ce6385ab18549ccf02ef8329b2fd514a5eaa895af75868957ffc13be555f2	2026-10-02 07:38:05.636
1314	37525e69cfd90387ac00b38b5aa88d56ae7e5f41908254e20527abe01ee21b48	2026-10-02 09:13:10.843
1320	22036ada7a28ed8c62eaa16a60dd6480109b8c79f6fb877b3e8baa791b955de5	2026-10-02 11:47:47.253
1327	3fefc402f5e949e7da32c7782fec94a6945bbf96fa2e3c7dd46fe0940169fe60	2026-10-02 13:28:55.258
1334	48622f995341a7a2b8121b1d476f5b8944ed5922da43c28352e5d77d64ef561e	2026-10-02 18:21:35.572
1340	856cc8fad8a65952d9616fe411c25a8c965192d0c45d600476e9f1d8c8844afa	2026-10-02 22:09:45.767
1346	52467362f094fec5d2d1307deeb2119e6987b59efb0a40f7ae4795432dec0e64	2026-10-03 03:46:03.196
1352	7b8acf6e6e13e884b69104e6897b63fbdff38f1ecc346db5c4ea03c71405e1b2	2026-10-03 14:22:16.811
1358	7e6f80fe7dc0d5790f21f12d41c6d52543c24aa88c8eda6319fbed0e2e18a34b	2026-10-03 17:49:40.59
1364	077511172d4ce85492d4dee9645ba6e12cf164cf79e48b340e0bcc72816499ce	2026-10-03 23:49:38.763
1370	ec118f0967fba4329739e80ebf9f4ea53c4ea0e9294a0cdcccb15262d2ee175b	2026-10-04 10:24:25.663
1376	5915dcafff2dc66cf017c64acf31ed01def1d5ac68928da33db13efa47f3b148	2026-10-04 12:42:40.345
1382	c3145084117531664b06888e88f7e78a11b94d019cc62fc95c49811c0151e33c	2026-10-04 15:49:32.895
1388	068990bfaf2788e4e3548899adb2efc142dc44fc1dace9e8eb85431a2f6978b6	2026-10-05 02:40:05.2
990	a1a14a9d5912b85d806e93ef8979fc7a49667ee75b01341ee30b11d658ad6f19	2026-09-26 00:08:14.817
996	589b83da4237e1efafe0fab392a396d1f66593d0f96a5bd58efe399c62df61f5	2026-09-26 01:39:51.306
1002	65886d2ff1c72f016f50080a1751ca2cd55a8adb124e74d5110c090943065341	2026-09-26 03:22:49.163
1008	271bd3420282b961a7ab50e500d6e0e7fd3e3e5ec3730525c867231ee440be3e	2026-09-26 03:40:39.232
1014	d4f055c3de5b31b3f19f873a47713b6053fefbfef7f1a0121e7d526ae8ecce8e	2026-09-26 04:30:59.441
1020	b97cc5b653833bf51cd18709e2eeff2e5bed1185f9dfe91b215f408d6684aecb	2026-09-26 05:29:36.253
1026	fb755159f6ba314cc58bf31483ed4539cbf6f674945c3eb1c697b60b1266f95d	2026-09-26 05:37:26.38
1027	2ee09b99280a2c078ff4d8f6c0342fa354e2afc9d9dcdcb3c88056fbe31ab22e	2026-09-26 05:37:29.846
1033	0aedd8560697a7a1cc1dd516f69b76b81360fddcbd34f65101d1184e6c27a856	2026-09-26 05:54:00.698
1041	f2aa1731c08f5ec92105e6af708d97c15a1b671abd3f9eaa1e2bc0684e21d98a	2026-09-26 06:15:13.463
1047	341c84c298a8722d676ab64ef12ba32f6dd8cabd7f5d8836c54c6470e0a661aa	2026-09-26 06:33:01.954
1053	f826a0ca2cb1a591a030dd49ff9fa43bea4ba1d9b375eda75c5986bcf9fc9418	2026-09-26 11:36:51.755
1062	dc46c2b55409190f8458e8a5c5076761e671537e8544f8135bebd1e15a352872	2026-09-26 18:09:37.374
1068	49a83879533fdb459c4839a1c9d0609daf11cf41d166d5055ce801268ea57386	2026-09-27 02:40:26.613
1074	88c7e3e86633d96a020cd4ba331df6a1f405b32b918de824fc3e4dfc1e0e40dc	2026-09-27 05:55:21.966
1080	0142e6b3740dd7c5093a7369997e48aa16509221da59e1307252774954ea24c4	2026-09-27 07:10:29.513
1086	5756a56a220f25556c86ffe757455091cd7b1828f60e6cdcc2ce2365a7c5c6cd	2026-09-27 10:06:07.674
1092	4d6237cd989b353369476fe6d7d5b1427f6bcc1f7723abab7de6180d807114f1	2026-09-27 12:43:58.982
1098	f65cc510e9b502bdb35ff9ac87701b839f308fcf14205ea4b713045e917cda59	2026-09-27 13:49:22.794
1104	6e14407d08575a7a61fa27a08f78f3eeab7eaebfe629106c285bd3d8ca3e8d65	2026-09-27 22:49:13.705
1110	ea3ebd4aea14113e06d0d76be29009f18cf9f2cf5b2e961433db7c734eb3f1e3	2026-09-28 03:31:45.976
1116	919362999ce9410192c931fdd4491c5537e7746aa5bb6a5588f8f4ac982e79fc	2026-09-28 06:24:29.268
1122	9d5cd19f6cad00612a757c3fb83e79ff2fabb18ba5e4dbdcdf3b8c6184a95ba7	2026-09-28 08:49:13.196
1128	61e018e22ccc168515781f6305a8c0b9a6977b64637881ea84832f6663413955	2026-09-28 15:05:34.085
1134	d91266aa8a270ef78272b73cef2340580ec8d84f3d934b5ffd46ef9ad327e9f8	2026-09-29 01:04:25.204
1135	d3f6d78376a96f6d6c2e7b74ad97a554f454d1510bb291903b295939b3edff5d	2026-09-29 01:04:28.263
1141	0d53d060db2f91a40995825cfd060ab11badf33440c8b67cbb23c657b3a8c267	2026-09-29 06:16:02.385
1150	16deaafc654448083eca1edc56fe1da86e8099c85c0e582971e8f8ba3d2b8c74	2026-09-30 00:38:20.171
1156	7a7aae14aa2b7da3dacd27f9b177fa12b73d70114cc392b910bf2ba58b5f42d9	2026-09-30 01:55:08.345
1162	ae4f784cfe84bd42a72f0d0023b491e65ab9b0e698d5eb460454845284064f55	2026-09-30 05:01:53.276
1168	e337508575f3c25b9eb8b8feb16b5a089c2851bae071332938646c828383df38	2026-09-30 11:35:02.149
1174	a0cf2894e932505bd3ddee83111826990273e2455246562bbbb39103754d26cf	2026-10-01 00:45:44.536
1180	fbd5297cdb806f50913b48e7d4759f3ed5f261e18ee62e0caa5a0303f05ce76f	2026-10-01 09:47:12.37
1186	5e7a69d7214b30c98710b01fe78aaa5ae2d1e2f88597f85358cf74ecfe96dc37	2026-10-01 17:18:32.916
1192	f2cbef067e4c2337e13f9f33b5f709264fe853443dee94da43dba91657a62104	2026-10-01 22:43:41.149
1199	deb81a8c6f0790457e4db4189bf2ae7fe49ba0de63950a68d174b5696aef64f7	2026-10-01 22:59:09.554
1206	d89c069b0decc47f26d2268f4c2478a64861e4f21fdbe9088cd66aaf06f083ef	2026-10-01 23:16:41.646
1212	d032596a2201e21f0bd952281694eef937d8d4f5bddfb0d0505fe71d83e829a3	2026-10-01 23:38:15.569
1213	1066c2be8802906fcd9a31e2d67beeb45a7744a426aa24ef8d05b45f2248be5c	2026-10-01 23:38:22.355
1219	156284d6f621902970a2a7f849bf58d2259ec9cf40a999a00474471e32c29741	2026-10-01 23:57:56.893
1226	1071bf2f804c600a2a79c1e5604683347c1194980db38baca23b0f5fafd9ecac	2026-10-02 00:12:29.247
1233	d9793131984bcfaf2f5867c27086189674d9426a4229ee9f919f9d794e2cba52	2026-10-02 00:27:15.255
1242	9055bcfb0b4fd32ed9415b74fc932e5a5f2c23b61573393ba125563d466339fb	2026-10-02 00:45:07.742
1248	046b5bfc41dff1c78a80a4d6ff603285e36b20e7580efe652fd22fe6e5e93067	2026-10-02 01:01:03.218
1254	68803307afe934b327eb115035647f216258a9a6d4abbbc38f8eb0c921cd0605	2026-10-02 01:23:24.027
1260	0e7f543d6028fffd8f79abff10c834b1af1e87aa4c630929494bbff3cd7f77e2	2026-10-02 01:45:50.643
1266	79c7342915a51eaeed72b6dbda228a895921bd66752755c42463980f5c77fe70	2026-10-02 02:08:39.071
1272	a40729b27b0b1b6d58799bd9a9bef3aaaf0c3c47f355f0c237a1cafa94913f65	2026-10-02 02:31:44.173
1278	d899e2b54a2452c97a7cc9317312b858ff7845856c74dedc6c09c77b15fc2824	2026-10-02 02:49:26.708
1284	71e497218d27b1ccaad9b83453d9c8ce7c43e1a589ecb09a9b5a6662f6de66cb	2026-10-02 03:05:00.67
1290	5d3e3f58be137d9e6286e6ab7eb003f1f72c0a8cd99d0415497df507625cee40	2026-10-02 03:38:20.195
1296	f58bc7231e26bf3c5dfdea7746607fb05c14da2ba988572d3bcc27cbcfd5a13c	2026-10-02 05:00:14.516
1302	750d85c7979c03d9121d7a731034fa65f9691e5723dd3c2169973a99a2c4c740	2026-10-02 06:15:51.828
1309	a31f300e2dbe1009763d8bdb8cb48df0e21830b86e9d01c03774775d76551df4	2026-10-02 07:38:46.397
1315	00d99f406110e9a259dd8cd93b10940bdba3b7a230dc8bbb7bcb7d0920f62b4a	2026-10-02 09:43:46.79
1321	a08262fd0a63b1effc31b46dd9ab4ded416057d8aac8666b0769c7d632179c7c	2026-10-02 11:56:04.555
1328	8d129a574924ab729a481294db0641340dc42fa88b4543d86e12cbe313732f45	2026-10-02 14:14:35.708
1335	71dfda870ec5b31afdf744ed1aaba4b61416c64460ca159da689776eea621a8e	2026-10-02 18:30:57.999
1341	d5242aaf4e7f858e1f368d0f91c28660cfedd05b4ea02382ef8c4faab6240b03	2026-10-02 23:24:39.523
1347	0d16b33066e85822ae9633b51ebdc13e27552682bab0df521bf4011f30a049f7	2026-10-03 06:53:49.214
1353	540101a0c52da9adaae709e2863cca2e3d4ea926205b019ee729ec16dbd58b11	2026-10-03 15:27:38.763
1359	1e98b6e05f5f7ef65aaa84f8253a79b59ae3069e42128ebd86d96ebd5e12cbfd	2026-10-03 19:45:22.758
1365	c83ef09e72dc748d6ffc19223cb19dc617bcc041a8a9825eff37af8e9b920449	2026-10-04 05:16:26.203
1371	08b4ba97bbd62a9a6f70fe2d94b417abf18e5a863763065925599a9b2839f9e3	2026-10-04 10:25:54.917
1377	85263838916084339f1269726313cbdcd92b3cabba71589d8f2eacfb85c8cbe7	2026-10-04 12:50:15.111
1383	a4a86ba9d3ea36946e50c0d05633d3a64ae676f2ab160a4173c131785470375c	2026-10-05 00:42:18.139
1389	3f10acf17ac5a85e14c5afef686a59d8232ec96f1bbadfc8ab1b7e10b02d93b1	2026-10-05 07:29:54.287
1390	8813bf8ef50e7b087ed423db81bd4ede71057487b2ad2775ac1427be45f14ed3	2026-10-07 07:16:01.893
1391	11c3a08567e5d4da5daba6630085c4361ff431662483ec7435ef0482df940865	2026-10-07 07:35:08.993
1392	1b492b3240676d07b4e0a0e8965476fde34354e7610701bdd26e122aac7ca8c0	2026-10-07 07:36:18.621
1393	63a33e06cd94f16c33b4d389757d5614bff2d0128bd21af0ab8b21dda0d8a4ab	2026-10-07 07:51:34.056
1394	077cc9da520a131af7da113fae60a4ab1dda4b0e6a6903be613cb144b082a561	2026-10-07 10:41:41.288
1395	d4e053538252a575a1e875bcc88532e82d085cd6acf6f8f2d967cb408b279d08	2026-10-07 10:59:38.844
1396	852b622e01ea2dc67763f51c6dfaf36b4200adc6ab6e69aab01470a6aaab6a8d	2026-10-07 11:56:05.67
1397	a64e4d859997460a711aab97e7c4db54bd12390b3d02c175f3d9407e85f9eb3a	2026-10-07 12:05:15.316
1398	e9e736ee8b076f38aebdcf860058eae41c3a47d85087fb650e6f4186616dcdb1	2026-10-07 12:21:07.688
1399	16c0f7291e7eb7ebe97e85bffc48eba373c8067bc1cee2c7bcfa46a7177ae986	2026-10-07 12:27:49.413
1400	a835f9f8c40a033ecc8d79673733215c18ed5866cbeff0c307902c430868cc5f	2026-10-07 12:47:25.497
1401	d990a72c534bf2cc3a263a2a4747f96c535bf201dba6b79d5b2a80c78598d01c	2026-10-07 12:54:30.136
1402	cfb2674ff8168e7961f7b9672b3034374e7deefb8684af94c349ec4a10c04dae	2026-10-07 13:55:02.287
1403	8976ec72bdcac726ffcf79ee4088927beed8bba9768417b76406d139e0eea906	2026-10-07 14:10:19.751
1404	015cb290534010b65c8d667de1f3cbb3f1ffb31c8658537cf990874ada6f9066	2026-10-07 14:13:24.357
1405	dfca1accc6596407fb371b10c4714c71834467b67089e070946960d8952ff914	2026-10-07 16:39:04.492
1406	e23b9051d78cffe8fec59854f2a7dd2469816d260a0671d1c39bebcd097b5a10	2026-10-07 19:31:32.731
1407	ca6d817b52ff8b03d36c44ab8d8d8dc9e89ed3f646266920394f25848b7cf8c3	2026-10-08 07:48:47.766
1408	fdb02b0c9f0a5e2e240e5afbb5357c18011a33f19600070bec2f35ad2955e3a4	2026-10-08 08:28:17.797
1409	98146727f165477945fb0ce106c33c306f3b6e51f7a905cedd9ec3ab273d2547	2026-10-08 08:31:43.389
1410	511e8de4c7313a60984b6ab2872db5a4e8ca754ad48576922e2f833579321576	2026-10-08 09:00:43.247
1411	41eb7c321d594f2eed1a2dd079ff0b2257bb911faed54aa357a6e761ae12b93d	2026-10-08 11:43:46.115
1412	e8971e42382027014ecf5052ffbde3aff37c4e3a36bf19da70f3c0dedaa4dbd3	2026-10-08 12:10:15.455
1413	a5de748985e9d5f6fa0c13df0865fe1e362558ba536e338aefcc70c4d92bf7a6	2026-10-08 13:11:14.885
\.


--
-- TOC entry 5921 (class 0 OID 79070)
-- Dependencies: 276
-- Data for Name: PaymentMethod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaymentMethod" (id, code, name, type, image, fee, "isActive", "createdAt", "updatedAt") FROM stdin;
29	S1	Bank Sahabat Sampoerna	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/S1.JPG	1500	t	2026-07-11 00:14:37.988	2026-09-23 10:39:32.197
35	SA	Shopee Pay Apps	EWALLET	https://images.duitku.com/hotlink-ok/SHOPEEPAY.PNG	0	t	2026-07-11 00:14:38.001	2026-09-23 10:39:32.197
37	SQ	Nusapay QRIS	QRIS	\N	0	t	2026-07-11 00:14:38.005	2026-09-23 10:39:32.198
2	M2	Mandiri Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/MV.PNG	4000	t	2026-06-26 21:52:44.075	2026-09-23 10:39:32.183
3	VA	Maybank Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/VA.PNG	3000	t	2026-06-26 21:52:44.08	2026-09-23 10:39:32.184
4	I1	BNI Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/I1.PNG	3000	t	2026-06-26 21:52:44.086	2026-09-23 10:39:32.184
5	B1	CIMB Niaga Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/B1.PNG	3000	t	2026-06-26 21:52:44.092	2026-09-23 10:39:32.185
6	BT	Permata Bank Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/PERMATA.PNG	3000	t	2026-06-26 21:52:44.098	2026-09-23 10:39:32.186
7	A1	ATM Bersama	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/A1.PNG	3000	t	2026-06-26 21:52:44.103	2026-09-23 10:39:32.187
8	BR	BRIVA	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/BR.PNG	3000	t	2026-06-26 21:52:44.109	2026-09-23 10:39:32.188
9	OV	OVO	EWALLET	https://images.duitku.com/hotlink-ok/OV.PNG	0	t	2026-06-26 21:52:44.115	2026-09-23 10:39:32.189
10	DA	DANA	EWALLET	https://images.duitku.com/hotlink-ok/DA.PNG	0	t	2026-06-26 21:52:44.12	2026-09-23 10:39:32.19
11	SP	Shopee Pay QRIS	QRIS	https://images.duitku.com/hotlink-ok/SHOPEEPAY.PNG	0	f	2026-06-26 21:52:44.126	2026-09-23 10:39:32.19
12	LA	LinkAja	EWALLET	https://images.duitku.com/hotlink-ok/LINKAJA.PNG	0	t	2026-06-26 21:52:44.132	2026-09-23 10:39:32.191
13	FT	Pegadaian/ALFA/Pos	RETAIL	https://images.duitku.com/hotlink-ok/RETAIL.PNG	2500	t	2026-06-26 21:52:44.137	2026-09-23 10:39:32.192
18	AG	Bank Artha Graha	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/AG.JPG	1500	t	2026-07-11 00:14:37.961	2026-09-23 10:39:32.193
20	NC	Bank Neo Commerce/BNC	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/NC.PNG	3000	t	2026-07-11 00:14:37.966	2026-09-23 10:39:32.194
23	BV	BSI Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/BSI.PNG	3000	t	2026-07-11 00:14:37.973	2026-09-23 10:39:32.195
25	DM	Danamon Virtual Account	VIRTUAL_ACCOUNT	https://images.duitku.com/hotlink-ok/DM.PNG	3000	t	2026-07-11 00:14:37.978	2026-09-23 10:39:32.196
\.


--
-- TOC entry 5923 (class 0 OID 79087)
-- Dependencies: 278
-- Data for Name: Plan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Plan" (id, name, service, description, price, "hourlyPrice", limits, "isPopular", "isActive", "createdAt", "updatedAt") FROM stdin;
61	Business Quake	BMKG_EARTHQUAKE	Enterprise earthquake info with WebSocket push and priority support.	75000	106	{\n  "requests": 6000\n}	f	t	2026-07-12 11:45:56.746	2026-07-12 11:45:56.746
59	Starter Quake	BMKG_EARTHQUAKE	Free access to latest earthquake info	15000	23	{\n  "requests": 1000\n}	t	t	2026-07-12 11:43:58.401	2026-07-12 11:45:59.669
35	TikTok Pro	TIKTOK	High volume limits for professional apps and business tools.	75000	106	{\n  "requests": 6000\n}	f	t	2026-06-27 15:26:45.183	2026-07-12 12:01:52.62
1	Starter	OBJECT_STORAGE	Ideal for personal projects and backups.	25000	37	{\n  "storageGB": 10,\n  "transferGB": 50,\n  "requests": "unlimited"\n}	f	t	2026-06-26 21:52:43.943	2026-07-12 11:58:38.11
2	Basic	OBJECT_STORAGE	Perfect for growing websites and applications.	75000	106	{\n  "storageGB": 30,\n  "transferGB": 100,\n  "requests": "unlimited"\n}	t	t	2026-06-26 21:52:43.956	2026-07-12 11:58:48.963
3	Professional	OBJECT_STORAGE	High capacity for media-heavy applications.	150000	210	{\n  "storageGB": 50,\n  "transferGB": 200,\n  "requests": "unlimited"\n}	f	t	2026-06-26 21:52:43.967	2026-07-12 11:58:57.66
54	Starter Quake	BMKG_WEATHER	Free access to latest earthquake info	30000	43	{\n  "requests": 3000\n}	f	t	2026-06-30 19:17:00.364	2026-07-12 11:50:24.026
46	Blog Basic	BLOG	Standard limits for growing publications and news sites.	30000	43	{"requests":3000}	t	t	2026-06-27 15:34:52.159	2026-07-12 11:33:48.536
47	Blog Pro	BLOG	High volume access for enterprise CMS and platforms.	75000	106	{"requests":6000}	f	t	2026-06-27 15:34:52.166	2026-07-12 11:34:09.828
60	Pro Quake	BMKG_EARTHQUAKE	Fast & unlimited access to earthquake data	30000	43	{\n  "requests": 3000\n}	f	t	2026-07-12 11:45:03.224	2026-07-12 11:45:03.224
53	Pro Weather	BMKG_WEATHER	Unlimited access to BMKG weather forecasts with 99.9% SLA	75000	106	{\n  "requests": 6000\n}	f	t	2026-06-30 19:17:00.364	2026-07-12 11:51:02.884
52	Starter Weather	BMKG_WEATHER	Free access to weather forecast data	15000	23	{\n  "requests": 1000\n}	t	t	2026-06-30 19:17:00.364	2026-07-12 11:51:05.607
14	Starter	SHORTENER	Perfect for personal use and social media sharing.	15000	23	{"links":15}	f	t	2026-06-26 21:52:44.039	2026-07-12 11:59:41.103
15	Basic	SHORTENER	Great for small businesses and marketing campaigns.	30000	43	{"links":30}	t	t	2026-06-26 21:52:44.044	2026-07-12 11:59:58.345
16	Professional	SHORTENER	Advanced link management for enterprises and power users.	75	106	{"links":75}	f	t	2026-06-26 21:52:44.049	2026-07-12 12:00:15.086
29	Spotify Starter	SPOTIFY	Perfect for small projects and testing.	15000	23	{"requests":1000}	f	t	2026-06-27 14:42:08.033	2026-07-12 12:00:37.087
30	Spotify Basic	SPOTIFY	Access to Spotify Downloader API with standard limits.	30000	43	{"requests":3000}	t	t	2026-06-27 14:42:08.045	2026-07-12 12:00:45.505
34	TikTok Basic	TIKTOK	Standard limits for growing applications with moderate traffic.	30000	43	{\n  "requests": 3000\n}	t	t	2026-06-27 15:26:45.175	2026-07-12 12:02:05.659
33	TikTok Starter	TIKTOK	Ideal for small apps and personal projects testing TikTok integration.	15000	23	{\n  "requests": 1000\n}	f	t	2026-06-27 15:26:45.162	2026-07-12 12:02:12.181
41	YouTube Starter	YOUTUBE	Ideal for testing YouTube metadata and download APIs.	15000	23	{\n  "requests": 1000\n}	f	t	2026-06-27 15:34:52.119	2026-07-12 12:02:29.848
31	Spotify Pro	SPOTIFY	Higher limits for growing applications.	75000	106	{"requests":6000}	f	t	2026-06-27 14:42:08.057	2026-07-12 12:00:58.023
42	YouTube Basic	YOUTUBE	Standard volume for apps handling YouTube links regularly.	30000	43	{\n  "requests": 3000\n}	t	t	2026-06-27 15:34:52.132	2026-07-12 12:02:40.008
43	YouTube Pro	YOUTUBE	High limits for professional YouTube content aggregators.	75000	106	{\n  "requests": 6000\n}	f	t	2026-06-27 15:34:52.139	2026-07-12 12:02:49.738
45	Blog Starter	BLOG	Perfect for small blogs and personal websites.	15000	23	{"requests":1000}	t	t	2026-06-27 15:34:52.153	2026-07-24 09:34:16.57
8	Pro	CDN	Global low-latency delivery for high traffic.	115000	161	{"storageGB":50,"transferGB":200,"requests":"unlimited"}	f	t	2026-06-26 21:52:44.007	2026-09-05 09:45:27.552
6	Starter	CDN	Accelerate your personal blog or small site.	45000	54	{"storageGB":10,"transferGB":50,"requests":"unlimited"}	f	t	2026-06-26 21:52:43.994	2026-09-05 09:44:13.202
7	Basic	CDN	Fast content delivery for active businesses.	75000	106	{"storageGB":30,"transferGB":100,"requests":"unlimited"}	t	t	2026-06-26 21:52:44	2026-09-05 09:45:22.642
\.


--
-- TOC entry 5925 (class 0 OID 79107)
-- Dependencies: 280
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, slug, title, description, image, "techStack", content, client, timeline, role, challenge, solution, testimonial, "testimonialAuthor", "keyResults", "projectUrl", status, "categoryId", "createdAt", "updatedAt") FROM stdin;
10	nexvpn-vpn-service-platform	NexVPN - VPN Service Platform	Platform layanan VPN yang menyediakan manajemen pelanggan, pembayaran, dan pengelolaan layanan VPN dalam satu sistem terintegrasi.	/uploads/projects/portfolio-1781763368703.webp	Next.js, TypeScript, React, Tailwind CSS, Prisma ORM, MySQL, Docker, Nginx, Linux, OpenVPN, L2TP, Cloudflare	NexVPN adalah platform layanan VPN yang saya bangun untuk memudahkan pengelolaan pelanggan, paket layanan, pembayaran, dan operasional VPN. Sistem ini mengintegrasikan website publik, dashboard pengguna, dan panel administrasi dengan fokus pada keamanan, performa, dan kemudahan pengelolaan.	Personal Project	1 Months	Full Stack Developer, DevOps Engineer, System Administrator	Mengelola layanan VPN secara efisien, menjaga stabilitas infrastruktur, mengelola pelanggan dan transaksi dalam satu platform, serta memastikan keamanan data dan layanan yang berjalan di server Linux.	Saya membangun platform berbasis Next.js dan MySQL dengan arsitektur yang terintegrasi, dilengkapi sistem manajemen pelanggan, dashboard administrasi, deployment berbasis Docker, monitoring server, serta implementasi keamanan pada aplikasi dan infrastruktur VPN.	Proyek ini menunjukkan kemampuan dalam membangun dan mengelola platform VPN secara end-to-end, mulai dari pengembangan aplikasi hingga pengelolaan infrastruktur server.	Masdika.iD	Management Dashboard|Menyediakan dashboard terpusat untuk pengelolaan pengguna dan layanan VPN.\nIntegrated Billing|Mengelola transaksi dan paket layanan dalam satu sistem.\nSecure Infrastructure|Menerapkan keamanan pada aplikasi, database, dan server Linux.\nContainerized Deployment|Mempermudah deployment dan maintenance menggunakan Docker.\nHigh Availability|Menjaga stabilitas layanan melalui monitoring dan pengelolaan server yang baik.\nScalable Architecture|Dirancang untuk mendukung pertumbuhan jumlah pengguna dan layanan.\nResponsive Interface|Memberikan pengalaman pengguna yang optimal di berbagai perangkat.\nAutomated Operations|Mengurangi pekerjaan manual melalui berbagai proses operasional yang terintegrasi.	https://nexvpn.masdika.id	COMPLETED	12	2026-06-18 06:19:06.664	2026-07-09 10:41:25.053
\.


--
-- TOC entry 5926 (class 0 OID 79124)
-- Dependencies: 281
-- Data for Name: ProjectCategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProjectCategory" (id, name) FROM stdin;
1	General
2	Test
3	Web App
4	Mobile App
5	Programing
6	Kubernetes
7	DevOps
8	Networking
9	Security
10	Cloud Architecture
11	Software As a Service
12	Web Application
\.


--
-- TOC entry 5929 (class 0 OID 79133)
-- Dependencies: 284
-- Data for Name: Promo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Promo" (id, title, description, image, link, "isActive", "createdAt", "updatedAt", "currentClaims", "isReward", "maxClaims", "rewardAmount", "validUntil") FROM stdin;
\.


--
-- TOC entry 5930 (class 0 OID 79154)
-- Dependencies: 285
-- Data for Name: PromoClaim; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PromoClaim" (id, "promoId", "userId", amount, "createdAt") FROM stdin;
\.


--
-- TOC entry 5933 (class 0 OID 79165)
-- Dependencies: 288
-- Data for Name: ProxmoxServer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProxmoxServer" (id, name, host, "tokenId", "tokenSecret", "backupStorage", "addonDiskStorages", "mainDiskStorage", "networkBridge", "isActive", "createdAt", "updatedAt", "primaryDns", "secondaryDns", "mainDiskStorageSsd", "publicNetworkBridge", password, username) FROM stdin;
1	Sidoarjo	https://192.168.77.2:8006	root@pam!masdika	7e9a5b69-9978-4ecd-8d30-ab2123ceebb0	pbs-manager	hdd-2	hdd-2	vmbr2	t	2026-07-01 05:51:11.154	2026-09-23 07:50:38.248	1.1.1.1	9.9.9.9	ssd-2	vmbr1	Andikaferdi11	root@pam
\.


--
-- TOC entry 5935 (class 0 OID 79185)
-- Dependencies: 290
-- Data for Name: RegistrationOtp; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegistrationOtp" (id, email, name, password, code, attempts, "expiresAt", "createdAt", "referralCode", address1, address2, city, "companyName", country, phone, "postalCode", state) FROM stdin;
17	enc:b90e62ff621452f7fedcddec5ba1194d27bd7f5b6bb5787dc0e1548a28628db3	Aditya Firmansyah	8fd75cb280f0cf3d13234fa8842bed83:b19051fc0c77a0da33059519016abadd4a0a21ac10803c9eaf97d1f041d1393e4f4716c1f7eb88f5e5bcfd57f82b420a86b68c9bf6e7d56dad0385e7b7b73583	787768	0	2026-10-05 09:37:48.509	2026-10-05 09:23:03.511	\N	Gilang, Gang Menteng, Rt15, Rw04	Kecamatan Taman	Sidoarjo	\N	ID	+62 823 3162 3374	2143	Sidoarjo
\.


--
-- TOC entry 5937 (class 0 OID 79201)
-- Dependencies: 292
-- Data for Name: ReservedIp; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReservedIp" (id, "userId", "ipPoolId", "ipAddress", "hourlyRate", "accumulatedCost", "expiresAt", "isAttached", "vpsId", "createdAt", "updatedAt", "autoRenew", "terminationDate", "publicIp") FROM stdin;
5	27	3	192.168.78.3	20	6740	\N	t	53	2026-09-23 07:22:11.11	2026-10-09 00:00:00.658	f	\N	206.237.98.230
\.


--
-- TOC entry 5939 (class 0 OID 79222)
-- Dependencies: 294
-- Data for Name: ResetToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ResetToken" (id, token, "userId", "expiresAt", "usedAt", "createdAt") FROM stdin;
4	ea69d8c05e66b553c864e50bcddf02f5d9cc33207fec4506d99aa60b9f9328c1	1	2026-09-24 02:27:29.821	\N	2026-09-24 01:27:29.823
\.


--
-- TOC entry 5941 (class 0 OID 79234)
-- Dependencies: 296
-- Data for Name: SecureMedia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SecureMedia" (id, filename, "originalName", "mimeType", size, "folderPath", "isFolder", "isPinned", token, "expiresAt", "userId", "createdAt") FROM stdin;
5	folder-0e33ec1d-195f-47c1-981a-437b1e6884f2	TUGAS UT	inode/directory	0	/	t	t	37b08848-f845-4c18-bb61-44bfc84f8a14	\N	\N	2026-09-13 23:20:17.946
\.


--
-- TOC entry 5943 (class 0 OID 79254)
-- Dependencies: 298
-- Data for Name: Series; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Series" (id, slug, title, description, image, level, tags, published, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5945 (class 0 OID 79271)
-- Dependencies: 300
-- Data for Name: Setting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Setting" (id, key, value) FROM stdin;
31	SUBSCRIBE_LIMIT_45.198.149.134	{"count":1,"timestamp":1781593093526}
32	LOGIN_ATTEMPT_2a09:bac1:6500:8::19c:29a	1
33	LOGIN_ATTEMPT_2a09:bac5:55fc:1028::19c:29a	3
34	LOGIN_ATTEMPT_2a09:bac5:55fa:25af::3c1:2e	1
47	USED_COMMENT_TOKEN_fa71cd33a6b1d7bb	2026-06-29T14:39:42.366Z
48	USED_COMMENT_TOKEN_ef446f58f8dcaada	2026-06-29T14:41:43.995Z
49	USED_COMMENT_TOKEN_d128caf3aae46475	2026-06-29T14:46:28.516Z
57	promo_banner_image	
58	promo_banner_url	
59	promo_banner_active	true
44	DISCOUNT_3M	5
45	DISCOUNT_6M	0
46	DISCOUNT_12M	0
246	turnstile_site_key	0x4AAAAAABn5hezv1vvdPF97
247	turnstile_secret_key	0x4AAAAAABn5hWDvWfqotCZcpMMzMV47S54
35	mega_menu_order	["events","series","vacancies","community","blog"]
36	mega_menu_badges	{"events":"New","vacancies":"New","series":"New","community":"New","blog":"New"}
38	dev_menu_order	["api-hub","upload","shortener","storage","managed-db","vps","k3s"]
39	dev_menu_badges	{"api-hub":"New","shortener":"New","upload":"New","storage":"PreMIUm","managed-db":"Premium","vps":"Premium","k3s":"Premium"}
40	company_menu_order	["about","services","portfolio","skills"]
212	company_menu_badges	{"about":false}
478	ADMIN_CHAT_STATUS	OFFLINE
376	payg_billing_interval	hourly
22	meta_description_blog	Read the latest insights and tutorials on Cloud Computing, DevOps practices, Web Development, and Server Administration by Masdika.
23	meta_description_portfolio	Discover the technical projects, cloud architecture implementations, and open-source contributions developed by Masdika.
24	meta_description_services	Hire Masdika for professional Cloud Engineering, Infrastructure Setup, Server Maintenance, and robust Web Development services.
25	meta_description_opportunities	Explore the latest tech events, webinars, and exclusive IT job vacancies curated by Masdika for the tech community.
26	meta_description_resume	Review Masdika's professional experience, technical skills, certifications, and educational background in IT and Cloud Engineering.
27	meta_description_contact	Get in touch with Masdika for collaborations, technical consulting, or project inquiries. Let's build scalable systems together.
28	meta_description_community	Join Masdika's tech community! Connect with like minded developers through our exclusive WhatsApp and Telegram groups.
29	meta_description_events	Discover the latest tech events, insightful webinars, and hands-on workshops curated and shared by Masdika for the IT community.
30	meta_description_vacancies	Explore the latest IT career opportunities, remote jobs, and tech vacancies shared by the community. Curated by Masdika to help you land your dream job.
20	cv_url	
42	maintenance_mode	false
43	maintenance_message	We are currently performing scheduled maintenance. Please check back soon.
50	vps_enabled	true
51	k3s_enabled	true
340	object_storage_enabled	true
341	cdn_enabled	true
411	tax_rate	11
3	profileImage	/uploads/avatars/avatar-1783074802037.webp
2	twoFactorEnabled	false
1	bio	DevOps Engineer and System Administrator.\nManaging cloud platforms, Linux servers, and infrastructure automation.\nDedicated to delivering secure, high performance, and reliable systems.
6	social_facebook	
7	social_twitter	
8	social_linkedin	https://www.linkedin.com/in/andikaferdialvianto/
9	social_instagram	
14	social_github	
15	contact_email	me@masdika.id
16	contact_location	Sidoarjo, Jawa Timur
17	contact_phone	+62 823 3162 3374
18	hero_title	Hi, I'm Masdika,
19	hero_description	Specializing in highly available cloud infrastructure, CI/CD automation, and scalable backend services. I build robust systems that power modern digital businesses.
12	hero_typing_text	Cloud Engineer, DevOps Engineer, SysAdmin, Backend Dev
21	meta_description	Masdika is a Cloud Engineer, DevOps specialist, and System Administrator based in Indonesia. Explore his professional portfolio, tech blog, and technical services.
\.


--
-- TOC entry 5947 (class 0 OID 79280)
-- Dependencies: 302
-- Data for Name: ShortLink; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShortLink" (id, code, url, clicks, status, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5949 (class 0 OID 79296)
-- Dependencies: 304
-- Data for Name: Subscriber; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Subscriber" (id, email, "createdAt") FROM stdin;
\.


--
-- TOC entry 5951 (class 0 OID 79306)
-- Dependencies: 306
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Subscription" (id, "userId", "planId", status, "suspendReason", cycle, "expiresAt", "usageCount", "createdAt", "updatedAt", "autoRenew", "terminationDate", "lockedHourlyPrice", "lockedPrice") FROM stdin;
25	5	1	TERMINATED	\N	HOURLY	2026-09-20 10:00:00.036	0	2026-09-18 00:41:29.466	2026-09-24 12:44:42.825	f	2026-09-24 12:44:42.824	37	25000
\.


--
-- TOC entry 5953 (class 0 OID 79330)
-- Dependencies: 308
-- Data for Name: SupportTicket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SupportTicket" (id, "ticketId", "userId", subject, service, priority, status, "isReadByAdmin", "isReadByUser", "mergedIntoId", "createdAt", "updatedAt") FROM stdin;
1	TKT-374049	27	Balance Tidak Terupdate	\N	NORMAL	CLOSED	t	t	\N	2026-09-23 03:40:03.55	2026-09-23 03:45:41.414
\.


--
-- TOC entry 5955 (class 0 OID 79351)
-- Dependencies: 310
-- Data for Name: Tag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tag" (id, name, slug) FROM stdin;
2	Kubernetes	kubernetes
3	DevOps	devops
4	Docker	docker
5	Serverless	serverless
8	CI/CD	ci/cd
9	GitHub Actions	github actions
10	Automation	automation
12	Certification	certification
1	Database	database
14	Exam	exam
\.


--
-- TOC entry 5957 (class 0 OID 79359)
-- Dependencies: 312
-- Data for Name: Testimonial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Testimonial" (id, name, role, text, rating, "order", "createdAt", "updatedAt", image) FROM stdin;
1	Sarah Jenkins	CTO, TechCorp	Masdika transformed our entire AWS infrastructure. Our deployments are now 5x faster and highly available.	5	0	2026-06-14 09:08:09	2026-07-13 03:43:36.89	https://images.unsplash.com/photo-1438761681033-6461ffad8d80?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cmFuZG9tJTIwcGVyc29ufGVufDB8fDB8fHww
4	James Wilson	Lead Architect	An absolute master of cloud architecture. Helped us reduce our AWS bill by 40% while improving performance.	5	0	2026-06-14 09:08:09	2026-07-13 03:44:11.13	https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cmFuZG9tJTIwcGVvcGxlfGVufDB8fDB8fHww
3	Emily Rodriguez	Startup Founder	He doesn't just build infrastructure; he builds scalable businesses. Excellent communication and delivery.	5	0	2026-06-14 09:08:09	2026-07-13 03:44:30.045	https://plus.unsplash.com/premium_photo-1689551670902-19b441a6afde?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cmFuZG9tJTIwcGVvcGxlfGVufDB8fDB8fHww
2	David Chen	VP Engineering	The Kubernetes migration was flawless. True professional with deep knowledge of modern DevOps practices.	5	0	2026-06-14 09:08:09	2026-07-13 03:44:54.765	https://images.unsplash.com/photo-1530268729831-4b0b9e170218?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fHJhbmRvbSUyMHBlcnNvbnxlbnwwfHwwfHx8MA%3D%3D
\.


--
-- TOC entry 5959 (class 0 OID 79376)
-- Dependencies: 314
-- Data for Name: TicketAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketAttachment" (id, "messageId", filename, "originalName", "mimeType", size, path, "createdAt") FROM stdin;
2	1	1790134803514-bs0lywo.png	Screenshot 2026-09-23 at 09.19.35.png	image/png	273527	/app/apps/web/storage/tickets/1790134803514-bs0lywo.png	2026-09-23 03:40:03.55
3	1	1790134803515-bh0viar.png	Screenshot 2026-09-23 at 09.20.29.png	image/png	297768	/app/apps/web/storage/tickets/1790134803515-bh0viar.png	2026-09-23 03:40:03.55
4	1	1790134803518-q5oemdc.png	Screenshot 2026-09-23 at 10.35.06.png	image/png	799685	/app/apps/web/storage/tickets/1790134803518-q5oemdc.png	2026-09-23 03:40:03.55
\.


--
-- TOC entry 5961 (class 0 OID 79391)
-- Dependencies: 316
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketMessage" (id, "ticketId", "userId", message, "isSystem", "createdAt") FROM stdin;
1	1	27	<p>Mohon&nbsp;bantuannya&nbsp;balance&nbsp;tidak&nbsp;terupdate&nbsp;setelah&nbsp;melakukan&nbsp;pembayaran.</p>	f	2026-09-23 03:40:03.55
2	1	1	<p>baiik&nbsp;mas</p>	f	2026-09-23 03:40:34.934
\.


--
-- TOC entry 5963 (class 0 OID 79405)
-- Dependencies: 318
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, password, name, image, role, "twoFactorEnabled", "twoFactorSecret", "createdAt", "updatedAt", "isSuspended", "suspendReason", balance, "affiliateBalance", "referralCode", "referredById", address1, address2, city, "companyName", country, phone, "postalCode", state, "isReseller", "lastActive") FROM stdin;
12	enc:4fb6272855d4077e2f4e12ab1d2b2c6c020c3748534b7e5a5d97bb1e501988d7	841fd706d16a480582139e86396d0ac8:1352cd952530f16b5c8e4c68f2ef800e4bb0535b25063328cd599897eac2e1039c7cfb19e589e053fa404b8a1061cbee3ca926f23a7c8962de234e2e8cc1c98c	imasemox kosong	https://lh3.googleusercontent.com/a/ACg8ocJybQ1L3ZFgh_O6Fkc7m0lFykIi_JSe5pCt1Jeg8Ab7JMtUV7I=s96-c	USER	f	\N	2026-09-11 12:41:05.837	2026-09-11 12:41:05.837	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
14	enc:bff66080797b3abed8e2d342f49085fe8900cbf89e5759f122d3017fd1b54895	27e1799c070c09150029a16f798e13bd:7348bbadad3c19df80807a7c2cb787c79f52c242931808bef27f4f182aef88c02ab44d31e8cdaac13db52aaf658a779b5cc9584d0684fcc64de5567459bdfbf9	Danzu Developer	https://lh3.googleusercontent.com/a/ACg8ocIVV0pBh1a_blgxkBbSJwa4SnDin7ybHD4dsjbfwuvSFt805oM=s96-c	USER	f	\N	2026-09-12 12:13:23.504	2026-09-12 12:13:23.504	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
20	enc:03f09db76007fa24891214c1759f896c400ffe18cfd0d6b49d32a8baa77cf97b	71e92d5d64a094e06b8989a544976ad5:c64a9c1c791e7c65403204e8212c2866b6282d9f9e042fa4f90d644306d5875b93876ae0459eab3755b67586e8c0a91a413b32536777642f2b0d248a05b0f2b5	Moch Alfan Miftachul Huda	\N	USER	f	\N	2026-09-14 03:39:28.525	2026-09-14 03:39:28.525	f	\N	0	0	78BD3058	\N	RT 001/RW 003, Bungur, Kanor , Bojonegoro	\N	Bojonegoro	UIN Maulana Malik Ibrahim Malang	ID	+62 823 3136 8208	62313	Bojonegoro	f	\N
15	enc:f1ad45847ca27d6506885d09af03c03fd64403f41454c67f128fcc29968d7596	7eb3e99ca7de3a54b3a9b7116c45f04b:9478c9aff26309d546cf09c62d548421c0f16ad79de5c9746ec2d0899811ec83736e48fbdff7cee45672d9873468509d2cf9336352b5e44de01d3c4c2e901638	Osmora Support	https://lh3.googleusercontent.com/a/ACg8ocLVBGkXSo3o2ASLJsFVV9vbkw40Tyb8WjbRDTA9snlzHWf3JtE=s96-c	USER	f	\N	2026-09-13 14:10:56.437	2026-09-13 14:10:56.437	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
16	enc:2be9e926f16cbdff0a429daef970d28de57e85b3d591038394f9bdc4f846af87	645e2581f7ac5364fd778fbfabe28354:8365f98e8152f8d86b55e22afec0e13667f538f13b82bdc903af81d49d92dfeffdf2015121992f4167ea0fde47bcbd4946f3222c329bc8fdb52e4145ff1f525d	ryna dep	https://lh3.googleusercontent.com/a/ACg8ocIz-jHD5st_7ROREnxQ-MwlpYe7Svw17cl6jXHuzjWGl36P1pE=s96-c	USER	f	\N	2026-09-13 14:27:44.342	2026-09-13 14:27:44.342	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
17	enc:6b4404ec8bfe3397fff1ae2deb51cb8fedf37cf782a22d5842cdb96148b6e498	9bdf5cbe82625bb592dd58eced60df5e:63d49c832b29076b79be93e9db2ac50007c3296aefd133c54256cf9f581894efda5fa83e9bad11fd4d587fc0faca4dfadbcab192ca2abf22de45910631c677f7	ryna ambadep	https://lh3.googleusercontent.com/a/ACg8ocJoMYYHNqkNwQD65LELneFHioautehZGwfMlCzBHABORCIymQ=s96-c	USER	f	\N	2026-09-13 14:29:25.4	2026-09-13 14:29:25.4	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
18	enc:176fa8060f379f909065d1aa1d12a2e266d042e20cadf8027ed9d3ad0923445b	14c1c9c74ffc8a18e73380104eab178a:e55f155e38d95e5d179381f8f60b15ad4761a2d863338129517ac1d58cc42f8b924084f482de746e66cb63db43d8278a0a7edc5c54914fe7243f8f67c72332e7	Ahmad Bagas Adiputra	https://lh3.googleusercontent.com/a/ACg8ocKGW_2pEryD8d_zfu5but87Aocyx-VgOEXoiOSWSiErpEtcukkh=s96-c	USER	f	\N	2026-09-13 23:31:53.432	2026-09-13 23:31:53.432	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
19	enc:25df1d710329a825103ef8a78d058820950033df982c55c1b7252eb9b83cdbbe	a134d5e35ceeae2b629bdc6750450d26:386d03f603bbbcf92c54485a12cf5e1055af770737121664ff5fae1b4fc940ef4521d335a15a0cf3c24b51153243069687ccdf7d6fa8e79ea2dfde91263229ba	Evan Aryanto	https://lh3.googleusercontent.com/a/ACg8ocJzBN8yrauJtOzGOBtYiCYK2xy5sDQwADLxwa9eHiaNdBnHSrQ=s96-c	USER	f	\N	2026-09-14 03:11:52.106	2026-09-14 03:11:52.106	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
21	enc:a0c3b07ec213f89a64fda34af097b7577e602858e70094466febcd36e417cdc6	6956b8f6e85ddaac5bb1b9ccaea3bbb6:2713830c9a69b9bf5dbea5dc2dd35e772721dd5ac442260d14aa85c0643ede403667040b46bffe822bed926dc1ad9f80d89e41333117bba23a30adb4830f514f	eccy yulian	\N	USER	f	\N	2026-09-16 04:42:10.373	2026-09-17 22:26:21.926	f	\N	0	0	7578C52A	\N	Grand bunga lestari blok e9a	\N	bandung	\N	ID	+62 812 2997 087	64395	bandung	f	\N
24	enc:82a550d4870cc939d059b186e25e7f828f19ae01b448a9eb4b9b03d36e128e1c	d14c650d3059b697c621132a2b6ce9b3:bb1841157c20a4f70ef163a1d9af737afcb87f2bbe84d7017637d32b5c57bc71fc9c00c3e00ce165300bc73a6a59edd88b109eb40fb6bde87b8675efc41c0f46	Hanz Cloud	https://lh3.googleusercontent.com/a/ACg8ocLazPdV60efjhhvVCvpMDK1u5h7LUew5GTvat50I57dn_HtrQ=s96-c	USER	f	\N	2026-09-18 11:43:19.418	2026-09-18 11:43:19.418	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
23	enc:6cbfbbdfd1a20e40bf88fccbea7a481b03e70a793af7295ff390cd86fed15efc	0b74028d7ef8b129ecb015f6b9941924:1754243586bc0f72ad7141e1b59a7becc3749985742420cf3b427f15aa340e31d12b77a0b26eae2ea189ea744f1fe9fa10923e2693eace62fff905a7d36ae3ff	Muhammad Abdullah	https://lh3.googleusercontent.com/a/ACg8ocLu-Ee22LUZ7wTyhpxc6grKCut_S1flxkrBNMDFiarInTN8nw=s96-c	USER	f	\N	2026-09-18 11:22:08.284	2026-09-18 11:22:08.284	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
22	enc:9cb54e7f5d427302e17f3db9c22bec2fc89b39b4a66f2ca59b8b5e8619a07816248c0dafe6af9466b3b938bd59a9378d	d4fcc106ae50091cc0b8fc92047c2161:065975086b3f0920f5f0ad00b4d2ffefcfd47808fff8d79aa90aadd1cf4e6837498547ec720140cc5ef3395c92b33b7304180934e581fd7aaddffd7d429b29ce	Arya alkha Ilham	https://lh3.googleusercontent.com/a/ACg8ocJqTZzsCTFgF6Q6ML0hWj4HBPH3NdGE1l-yVWexhl-LWTE1n7I=s96-c	USER	f	\N	2026-09-18 05:49:18.248	2026-09-18 05:49:18.248	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
25	enc:8d4b21d0844ae686235041ef8f1fe69d9593903e3248af7b42628fe25d36bc14	c44d1b70da6488d84108d93e6180c8ff:af556a4fb8e935943956352646f62dfdeb721175135287f4ea8237783f0ff8602e6e953f6f2f07341348f66d1b0e09f7f99a773f97a457486ea660ac27a1de3b	OhMyD3v PUSPITA SARI	https://lh3.googleusercontent.com/a/ACg8ocIJ5RoDEM62HQG9yMeDnEtKPgrEkfabm1ZtsFjH0DsRfFWw4QSB=s96-c	USER	f	\N	2026-09-20 06:25:59.739	2026-09-20 06:25:59.739	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
13	enc:ceb495f306e7bad1d7e2a1e1fb0cef81a992499a68d542600e213dd0a94e581b	14060929b9b8462b8f5c9004351a74e0:875f8caa7517ee430bac6db9b82fcdb440110307753ee72e8bf9369bbafe0b00409eb916f46dc8f7db2fcb62ce88325f53c441fbc8ec48c70d82ebeeb5b81936	Marlin Hidayat Tanjung 	\N	USER	f	\N	2026-09-11 23:31:55.529	2026-09-22 04:00:00.133	f	\N	95420	0	70AC173B	5	Jl.Masjid Humene, Gunungsitoli Idanoi, 	\N	Gunungsitoli	LINUXPOITER	ID	+62 628 5119 062492	22810	Sumatra Utara	f	\N
33	enc:f2cdf70ff80d214d50455518c33396a29973f0e812898b2f0587ef8cded9da0f	3d94e482b2713e4a60f037ec0bff853b:3731ea9a009cbc98fd9218919cb58142e73570fbc6cd8587f63bcaa35737768179677c91e2983c1f0b09d435b614869e9855f357a344f847602ca6cfde73e5fb	Mbxz Stillontop	https://lh3.googleusercontent.com/a/ACg8ocIDAFEQ9P3OnIURAe6F32_ntPdmkuSRGeFwrRWePj2SCOwzdg=s96-c	USER	f	\N	2026-09-24 03:49:19.678	2026-09-24 03:49:19.678	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
32	enc:bb509d7c67bd5658a5c8ff51e79cb0536ddb1ae2dde92a742b367a9c7c8abdc7	7ff4f95845cc227a58ba9e02cfe3c2dc:2735a62b2c748f8ad5d8540005e813e97fe2d7da85e6e3498906760e90ab98a48bf2c3520f750daecec8896edea4cfd02f95471cfbaf26bcc8cf654f4c85dd03	Yovie Setiawan	https://lh3.googleusercontent.com/a/ACg8ocJGl7QDROmkKWCVX6fR6KzUoxZ5FZoI9xyTeuxTT-n-9CEyxfwipg=s96-c	USER	f	\N	2026-09-22 08:18:24.718	2026-09-23 03:41:48.722	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
26	enc:adcff5121897151ec41157b602e9cb3546821fed0e5e06ad308d4b8c6f377921	6659f75ba3f5ee1e83d2f4428764a3ce:2499dbf6e0004d29f446f43de1080b306eb5177aaefc25b75a6d0e364d288303cc5b955622e06d147f649ad3c78e9175a4201eceab39ceff673db4a956fa2152	testestes	/uploads/avatars/avatar-1789961559375.php	USER	f	\N	2026-09-20 13:51:14.47	2026-09-21 03:32:39.376	f	\N	0	0	AD3CD5E8	\N	dgrfdgrfgfdr	gdfrgfdgfdgdfg	fgdfgdf	dsfsdefdf	ID	+62 435 6465 4656	43545	gfdgdfgfd	f	\N
28	enc:c6e28bf0ab9d528fe3cbb5df8f6ea10222b913707fdeac91b56a4891c9070d23	0cbd4fa4e0bb3c14e8bd8ac0a4207b24:2c790f93762b97f21e65d2d2b99dc645167efd7d07176eb4a590ec1ecda2f1d4db830d29399b7396e24e498231275d14d85b991085786a7fe4402c750c26ba3c	Gaje Heizou	https://lh3.googleusercontent.com/a/ACg8ocLEml61C6eirV1UqTpZIubdmrHv1UAGiPVrt0h1S0W5rP5DtYY=s96-c	USER	f	\N	2026-09-21 13:57:23.759	2026-09-21 13:57:23.759	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
29	enc:724cbdde2b4573ed2145b81b572296e2eb5952352e7fdb18086277dfe13c0348	93fa6621f70fbc24e8b6b6f7ff3dd68d:aed399cbe6f3464dee2173f593e59731f5e87227203ef93bd0d37179b6c7d27c338e37e6dedbaae00f5e068d8d8416040efa47c700488308b3622f69b7858c05	DAMA SATRIA ROLANANDI	https://lh3.googleusercontent.com/a/ACg8ocL2j7_PuPFPqCy8OZdl1NGy32E-rCHR2RjVcDAx808Hbt2TuA=s96-c	USER	f	\N	2026-09-21 14:20:36.388	2026-09-21 14:20:36.388	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
30	enc:ca11729d1f5daf6a341ecc7590052eec8c3a480dc9fdb9d8a33c73f849d6893d	c0e95e12b3c8e7b4e194019d08ff7448:34cb3bc46d009db2a4df113b0286b354f70bef740b75f869ae5c37086446234bdf7da132ccdf691f83a6463697c38780f597dc3c97fa0ca47d9782304f4b1c2a	nethost Sgp	https://lh3.googleusercontent.com/a/ACg8ocJb4f-ub1KA2hD4nJjc53hxm9hAPKyIhStvr1B-OsUYbNmEPg=s96-c	USER	f	\N	2026-09-21 23:07:19.296	2026-09-21 23:07:19.296	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
31	enc:f5738756dfe6a335111b875c5216b8cf7e22286644996b456bbbc473c09acc5f	233930961ff9d9472c7369c3c223f551:8a880fc71df231a83aa431d6a69c38006a75c0e3237750b15572d31c26ccfd7e05a07f00999c4a4d0be07493a50bb7906f13b2639fc043322f2095016f2fb705	Eko Winardi	https://lh3.googleusercontent.com/a/ACg8ocIzZpoGBDvtNbxSK8dsM4h1A8cbGL0ML1tR-X7cqtpRIye0POkj=s96-c	USER	f	\N	2026-09-22 04:06:11.77	2026-09-22 05:49:55.92	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
34	enc:1031eee71aacd36a3f533993d41ec91e8e6c9e606eb98960ff66e8a16946a802	a6157a029733cbf4b7bad7b3bcb6d06d:966473be6d95056857e89816e50f54be4c1d99ad6f4d693de27deaf449bdc25e87f50cbddaad7bc7cd66ed224c878e47e061c4b23f4d1ef0fd716e7a4c77dccc	rama adhitya setiadi	https://lh3.googleusercontent.com/a/ACg8ocI5N5ILX8X-XHUajDreYowL7u0RV-kzUX6V0xJBQx0UG4IeJg=s96-c	USER	f	\N	2026-09-24 04:31:13.241	2026-09-24 04:31:13.241	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
35	enc:957f8f01dae8c3fecf06452f854d8191f2e0c0ec0a4cb5c1e8bdde68bc4d30ac	a30a8d2e462e3c8dfc29b63e0380519a:53bd4485b8944a176616ea10da2f0529ee2a3071ff8075ea2710779786019e4709ba734b9f7380ad91a255815dd6895243016c7e99cc91b04541789f5f7fd2bd	Muhmmad Roni	https://lh3.googleusercontent.com/a/ACg8ocI9SUR7kOjR9eDjv6DEhtpVVgM7wYKXUTaeql3KsjdljrBzvw=s96-c	USER	f	\N	2026-09-24 06:34:50.339	2026-09-24 06:34:50.339	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
11	enc:2383d8602d7938e597e9045aa9f567e8cf0f8770b17767aabcfb1b64476a5095	cd77a411528529482a18df4ea34e5663:e16de65cff9d7c1e15cf11590efe55239e014b5660aa4cadb956baae33b85a0d53c2d85dcf1577a0c9a104d3d403c7bc9b867627da065067a4d18f55477da176	Aditya Firmansyah	\N	USER	f	\N	2026-09-09 08:19:34.17	2026-09-24 15:07:49.298	f	\N	49980	0	333787C0	\N	Gilang, Gang Menteng, Rt15, Rw04	Kecamatan Taman	Sidoarjo	PTes	ID	628233123374	6125	Sidoarjo	f	\N
43	enc:1e810d866528352aad4e66cab945b15b740509d2a51f9a1dd351d95b38c328ac	ab1d33842f6291d5c7bdb09e5387ffb4:2ebcc9f61dcbfb4c5712c23178d64e31cb60b9f42533eeba80adf917e04eea5f26ac71683c1f3f94269796eed3dd12216399ffe34876a0c2b3a8f63f91e1c285	nova	https://lh3.googleusercontent.com/a/ACg8ocIS9d6a0lL85UabI-N8jDSbc8QtKege9gd-iSj34mKSVTtklZE=s96-c	USER	f	\N	2026-09-30 11:35:20.88	2026-09-30 11:35:20.88	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
38	enc:6664129e20e2ab8dee6aefa9e04a8f6a7d646f95572a6fa63128aea79c470586	93105125b9ddc21e71f18c65bbe9946c:efc912b0ea8859e27b012c470c128cde456b79343958e34530574d60261eb10178b6828375d9febf17ffc7d8a9da19f00f835e38e7e1b14103ffbca0ee9ae346	Muhammad Farhan	https://lh3.googleusercontent.com/a/ACg8ocJmnzOn4ObIZnV_GdfZ1xDIKOtZCYUnCEoiJJ5T1lPK0PY4qg=s96-c	USER	f	\N	2026-09-27 05:41:15.102	2026-09-27 05:41:15.102	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
39	enc:436b3922a7f7cc1307217a979c922653712231099ae835d58b6fb1c78123024a	a8b279befc20ead75968f609b7a573c8:50c7a34883a6ed4f2d23f24eee4d1eda6c148c1ecc5521adb04f5f69f8d49ea193386aee94cd9ebe32e7633ceda2888f256dbe00da46c4268e021cf34a87a021	nafian	https://lh3.googleusercontent.com/a/ACg8ocLnaYzONs3kKEYU2cjYsJt-Y4LT6B86tFxZZvall1BEMKbm5Vg8=s96-c	USER	f	\N	2026-09-27 05:48:31.407	2026-09-27 05:48:31.407	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
40	enc:a4392014a21e6556748b39b4dc9ad9de057a29e0259b956f37b3fb1115bd4b94	7b8cd1359d3da76fa8c58467b0432636:b9a669cf1c7ff1aba60670fcc943141221bac4f7ea82499a786f7812f04ed234569008fbc2c649dbe86480f78364952808ac4b38f03a26896dc57bbab2f37895	Rahmad Nur	https://lh3.googleusercontent.com/a/ACg8ocIgs_bU_iGz95YgsQpF8jnN4b8GZEQV6CtZSzGwPF4RHl2-jg=s96-c	USER	f	\N	2026-09-27 05:55:37.076	2026-09-27 05:55:37.076	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
37	enc:8afd4578a8a95ff038f94f9d54bc22fc164f03b6921873c1448f9b4d51986681	33e1ec937bd1b61cad9dc747c4401ed3:d6fc8fc74bc0e693d4e1aa2cc24039bae5bf23275f64171aad84fe1fa713b6538bd4dcbb5025f5fd262c246a899ae69edf518c5d8789f4c31941a705a4d29a1c	ProfAC	https://lh3.googleusercontent.com/a/ACg8ocLE9kcXDcJDvc7CgYuDnN392sso_C1yPRSxVSFIwkO2mPnK-OyO=s96-c	USER	f	\N	2026-09-26 14:04:07.647	2026-09-26 14:04:07.647	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
41	enc:ec69097ac565c3872f25b4cb0804496ef7e0bc28b7dc3810fda0e69a47afb3c7	e701afa491342b5d94549090ddc78977:c4f7a32b1250b1849e89be4826465003fdb99af7a6b86b07da1129ae216ae9c23ebecc5f171c47f31c755d0a64cd670ec2ec9231d685d8776851e8c15fc08625	Sidiq Skg	https://lh3.googleusercontent.com/a/ACg8ocIqZhxdMr6Fd-Ir-UENPUd_WwhTdlWXcf6AaKM9trEKgmXZLQ=s96-c	USER	f	\N	2026-09-28 08:36:58.18	2026-09-28 08:36:58.18	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
36	enc:b0bd6b884d19d72e7ebc62edcf9d84a38317a09adb60755d584cb6b19868a36e	7304a2029762ba83fdc3a53c4e897a47:cda0b65a63d305fd0ebc075c5234d547e57b926c25eb3910f663d14b65f8c1eebb03e769a1a62679787dbb2a171ec4f31609399a2319ba541df84a7426fdb4f5	Riefli Alifiansyah Ramadhan	https://lh3.googleusercontent.com/a/ACg8ocJSSVv63o-jKXRC0t_d9VKvRaRR5x7F0RCwQ54mWEWDlsvYQZQ=s96-c	USER	f	\N	2026-09-26 05:09:49.857	2026-09-26 05:09:49.857	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
44	enc:74af2179fcead9aa6d4f0c37342cb60cddb642deb300e1c1ac2b98234b9d554a	d5648070ae7201a73f2760b7aa591fe4:157c6af377934a53cbb9b846c3dbce7e20ec5030ec92f1a03487cccff07cf36dc1d73cc8661c3e0fd1f25395adfb8c9902ab091cd7f6bdebfaad93bd5f455f32	Evan Aryanto	https://lh3.googleusercontent.com/a/ACg8ocJ0Ib8a6R3WeLWhJdz-IB-iOYAWMDZYFrKqxPIyM5kp9MBFufc=s96-c	USER	f	\N	2026-09-30 13:59:14.117	2026-09-30 13:59:14.117	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
42	enc:bded1f6c8c87295818502ab0f169feab947986a35b7b28b741c7ae4477c3c4b1	58133990352a02a9ee9b10b5e1c75617:59a45065ad24582b9fe0060ec467b697c8dcfae00d3226dd49fa894826ec134a3f5d16e25da000e4f88c85a9da7e5bee70adbed449ea6a504cd507c27c9471f7	Maxz_Storez	https://lh3.googleusercontent.com/a/ACg8ocLTTMMUcUBkcDGuJJDtGU3DQUThsJujKKy2xNF_-4kr11I8Fg=s96-c	USER	f	\N	2026-09-29 07:03:54.995	2026-09-29 07:03:54.995	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
51	enc:a95b4b29a053ac1147f52b334a8486d27c27d66b015865a54a2060f7a5a57ccc	11c883a12b88cae37b89b712208e8e75:bbd2ae7ef8390f04e9411f53d00265ae418c434cf99c355c7ef3d2c20123886226d16c146f9c623bcbcbeab333eb546c3695cc6867bbada591d41ed32ea85106	mamz always handsome	https://lh3.googleusercontent.com/a/ACg8ocKdaWEbtq3CcJJAgwcK7MsWQCknBXfpwZ4yEGHAvpQeFovsfAY=s96-c	USER	f	\N	2026-10-02 13:16:48.093	2026-10-02 13:16:48.093	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
46	enc:ec82db5afebac6d0f5f757ea44e9a8c3e62a040802a34c9f2b3d16e726996d23	bb550925e18f4ecbe1f8af6fa0b8318e:81da4e2491b893d419e08cc9e0684093226225fa9ae784bf6ca3743652f800dbba2dfce7bd89ae162a60f6e5cc7b126e4a0ae6ac9e91889390cfedbe97c32b18	Aleph Sc	https://lh3.googleusercontent.com/a/ACg8ocI1LIZq5mdyGyh1CfolDKoNQqReFxFDwd1Y7l1v_J9BQNiKBQ=s96-c	USER	f	\N	2026-10-01 14:20:42.822	2026-10-01 14:20:42.822	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
50	enc:b2655ca5abba3f2876b704dd70ac511f295324d92bff056331ae4b130deca912	730b2935989189ef9fac45f64665bdb9:33c45cc26ae73fc6532231c31d7c4b2d57a8770cca1a567c1928c0cbd15b8ad5e88103322d27062db2326b3be9e755965475f13dc824738fd08f59f906d3a6af	FF FAIZ	https://lh3.googleusercontent.com/a/ACg8ocLmU_cgWukk8ijDdVfzeqyrnkWRSbZv7lHwnD1ymCxYU1v_EhY=s96-c	USER	f	\N	2026-10-02 09:13:52.813	2026-10-02 09:13:52.813	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
45	enc:daa5673682463b20f2af1912e6e20b018721b30c20c003391fa59a0428b1c784	d419a4c5ce61f3709221af9cc873d292:05cada7c1caeb4183172df3f4c702e354529249207fe34d6b75debf927e040cf4a46c60371555587c206a4a9c6fc3e5899e71234fc58ef78cf8ea6c4a50912fe	register operasional	https://lh3.googleusercontent.com/a/ACg8ocJwKze8Sc2FCATfLAEcyeMmNTqgAGQEYZhOqtGp-nM-aqpqEw=s96-c	USER	f	\N	2026-10-01 02:41:42.493	2026-10-01 02:41:42.493	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
52	enc:962c23cb7b650b9c8a46ba4eebca0ff383d87f82001998248607cf44b976b182	4630fdd067a4f8594a1cfdb485a3ee48:458c0ca061f8df99fe4398b961ff31b37e3ee184b100eb7a72ea743449852712530039f691527038dbc3cfc15d8b27f99bd3d2b7571e23308aa81c1a21db2fb1	Ananda Rizki	https://lh3.googleusercontent.com/a/ACg8ocL9b_sa2PuW2EEddZHYQad9oCh1XPvHC1J0fht1T3X5LaSka4c=s96-c	USER	f	\N	2026-10-02 18:31:52.424	2026-10-02 18:31:52.424	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
47	enc:762558f8d2d5171113c7e486468cbefe5cbb776ace40115d558aaea31358d043	abbb06bdf87802f48fef0a3b2dc396b1:44f7081c54a0555f350a646d3778ecac178895b88637c08803f34bd5f57bd54afecd4a8bb2b434dab0376804f2a24e2d5bba6e4371f30f757cf762ba6a8566ed	Dragon 321	https://lh3.googleusercontent.com/a/ACg8ocIpEgzPwSpebQGkCB3mZwxo0tNaYdbsQQIhep386A4LKtRv=s96-c	USER	f	\N	2026-10-02 02:33:03.33	2026-10-08 12:10:15.539	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-08 12:10:15.539
57	enc:0e80d6ba75d2dcbb22728f91e5d3c34a545e419f272fbf5b19a5bda1f6216383	552705038fc1faff9dc4622a264bd80d:06dc3e3dc4d3508cca582d8644b0f3e969756bc97860b1f2a7cac109208aeea7344706bdc4dd3597d03eef4bab6a2b7edd984e8d53cc737dc8f026041b073450	Lionel Raffa Radiyenaf	https://lh3.googleusercontent.com/a/ACg8ocInY-XmsNaUnqmpaK-46NYj5aeRyJXfZs-G1ubo5aaJZmds6k2d=s96-c	USER	f	\N	2026-10-07 12:47:51.689	2026-10-07 13:25:40.303	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-07 13:25:40.303
55	enc:2790934f4d1afc8009776d090c30a1f1f2a0c1025be0a15743355a93dd3e4d74	701a4b6fdd91c91bc665d45279f9073a:77df6f089bcee4da3d5bfe8bb490333f06b4b6bfac5038a38819813a2abe448df42fd79698157c1bca7f40ada984caa84981542d7562bcd5944f3e145ef1087d	bau ketek	https://lh3.googleusercontent.com/a/ACg8ocI0iZT4eosz7900a9kXPwxUp0xggzFyFcWny7fi3gAiJ8YUneHN=s96-c	USER	f	\N	2026-10-07 07:54:24.25	2026-10-07 08:29:32.426	f	\N	0	0	1A0A4722	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-07 08:29:32.426
54	enc:eace6b3fff89822693cce6af3ecf13e33cc5e98eb79779ae325136679dafcf77	777f8c2ceaa13c817f3a6940e1d6f9b0:aca765dceea206815a277da17690051cb482d28d85e6c8c1abedfd0eed070388c41261c07fd3d2c739eff64a7f623a4b0329098761bceee70294b9a02cc3e055	Riski Ardiane	https://lh3.googleusercontent.com/a/ACg8ocIEye-IGM9AvjZ8m7xmSqPuDqF-cliEITdKhdof6VWeXKkxENc=s96-c	USER	f	\N	2026-10-07 07:35:22.471	2026-10-08 08:56:28.928	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-08 08:56:28.928
56	enc:5a6da35b84ceccb2fad7359fd5afde2eb12fe48992050046ac3524bbbc553e41	318fb40769f022cbf797a2ccc45674c1:f5495805c82d538eacf76d262b2142c58f4845e9dc76d4c0640be69f8820d4868beec019f5b7ad257510795cfd0882fab562a83687e63e1258357da3b878ba20	Wee La ciao	https://lh3.googleusercontent.com/a/ACg8ocJvSt7n_7GdZaUCujurQfyumgf6fN9mLAnL8SXPeQyIJMS-wks=s96-c	USER	f	\N	2026-10-07 08:03:04.081	2026-10-07 08:29:46.594	f	\N	0	0	2619FB1A	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-07 08:29:46.594
53	enc:a76ecbb1cb487df42d3ccc88d4a3d025d8a49e63954bf52930fa6d406806d325	9181b3c2ca143cbd4c66bfaa43af9c76:5500aaa3114c8c48ce032b77c9b0136c5fdd84fabffd8cc59289200ffdee3d8982f44fe4d17c95a1d89a60c5b8ebde28a7e7810680ca95a825bc8440f100fbfc	finger red	https://lh3.googleusercontent.com/a/ACg8ocK69W0VhePdbTjsnD0Wq0p8RBuGWy1j35x0iZMjoAS1P9Quow=s96-c	USER	f	\N	2026-10-07 07:16:34.248	2026-10-08 11:09:31.123	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-08 11:09:31.123
58	enc:3536212e151042a7db1b774fcb55c90101647b1d300f257bca3676c347e1ca77	1b10e61d6062a86670c6128d9ea6a9ca:19a3fe297263dfba65a6edb1709a4906c375cf12478b66a43d90a56a1e347ea4f6cebb0c9660fffea64e7301753e052ebab884920adcd24722d4437a7e3a2d80	Guardian Marx	https://lh3.googleusercontent.com/a/ACg8ocKDO6o-A8-73kczKn-qd-XcsTLZFMYr2h-StpNIAE4_mnfb1Q=s96-c	USER	f	\N	2026-10-08 11:44:02.191	2026-10-08 11:48:13.855	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-08 11:48:13.855
1	enc:b6f59cb40141156e320bd3101e64d653e03fb96f7d99bb73e5754aa72ac80583	6fbb182eab426fc6888711b62cae1206:6a229ab10305b738ebcef2541de8a73e6deb8f70ff87307eb24125a21565f78b57d98eee75b7e1f589fef277a9a4cf0b5b5f4b244b0f01b4c1f413840ca3a2db	enc:c6ac36a64f8c346cc9f8eff000434adf	\N	ADMIN	f	\N	2026-06-09 12:53:35	2026-10-09 00:18:02.763	f	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-09 00:18:02.763
5	enc:b844c61d0cbf3c380d2d64839ae67dd281fc663473c069b373df436863c7775a	945ec64d4f9ab2111b7e4663886a92ee:5680198f7f6c515ce065bb7be989aedf1d51b6f719e9a1b6941d7b7a636fda4de28f8790593ae75abc04e5e7d6bb8c251aed224e4c53dddec323a0792e99144f	enc:bfb027f9f8d1110ecdd8ee0fcb4948415b9bf1f0c1e7f08036a2c3cf5e2a76eb	/uploads/avatars/avatar-1783593948152.png	USER	f	VSTOASFYACNPYUABX7FHIZHVJ2OKOCPH	2026-06-26 16:19:44.726	2026-10-09 00:17:41.085	f	\N	87197	10000	8A772CA9	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-09 00:17:41.084
27	enc:3110f031b0af3bcf2befc0c1eb95ae63e7e8e090d6e458fac5a8b501f779de1d	e5ed52d54821a0aadfb1a4de3435bde3:f1bb86da099dcb2d6adab5a61fc71093027924d8c1578f26fee2b08be199f0b94ad3588692dc86db7d3051e33e0b376323491becc1499e28a0baec2f3eadae66	Ananda Dwi Rahma	https://lh3.googleusercontent.com/a/ACg8ocKuLUlrusD1xyVoUXBWqfCJWAoImiXGSfmwa1Thax2H2xc2418=s96-c	USER	f	\N	2026-09-21 08:28:28.426	2026-10-09 00:00:00.657	f	\N	82819	0	6A14559A	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-10-08 14:53:39.864
\.


--
-- TOC entry 5964 (class 0 OID 79429)
-- Dependencies: 319
-- Data for Name: UserVerificationOtp; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserVerificationOtp" (id, "userId", code, type, "expiresAt", "createdAt") FROM stdin;
\.


--
-- TOC entry 5967 (class 0 OID 79444)
-- Dependencies: 322
-- Data for Name: Voucher; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Voucher" (id, code, "discountPercent", "maxUses", "currentUses", "validUntil", "isActive", "createdAt", "updatedAt", description) FROM stdin;
2	NATKVM20	20	4	0	2026-09-15 00:00:00	t	2026-09-06 13:49:20.768	2026-09-13 22:32:09.94	
\.


--
-- TOC entry 5968 (class 0 OID 79461)
-- Dependencies: 323
-- Data for Name: VoucherUsage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VoucherUsage" (id, "userId", "voucherId", "createdAt") FROM stdin;
\.


--
-- TOC entry 5971 (class 0 OID 79471)
-- Dependencies: 326
-- Data for Name: VpcNetwork; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpcNetwork" (id, name, description, cidr, gateway, "vlanId", "userId", "routerId", "createdAt", "updatedAt", status, "isNatEnabled", "lastUsedAt") FROM stdin;
100	pg		10.0.0.0/24	10.0.0.1	3	27	1	2026-09-23 07:10:00.241	2026-09-23 07:10:02.557	ACTIVE	f	2026-09-23 07:10:00.241
101	VPC-1	SUBNET-1	10.10.10.0/24	10.10.10.1	2	5	1	2026-09-25 08:51:53.203	2026-10-08 23:47:06.695	ACTIVE	t	2026-10-06 12:13:50.358
\.


--
-- TOC entry 5973 (class 0 OID 79493)
-- Dependencies: 328
-- Data for Name: VpcPeering; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpcPeering" (id, "vpcAId", "vpcBId", status, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5975 (class 0 OID 79507)
-- Dependencies: 330
-- Data for Name: VpcRouter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpcRouter" (id, name, host, "apiPort", "useSsl", username, password, "proxmoxBridge", "interfaceName", "createdAt", "updatedAt", "wanInterface") FROM stdin;
1	VPC Router	192.168.77.4	8729	t	andika	Andikaferdi11	vmbr2	ether3	2026-07-26 12:51:41.724	2026-09-25 08:51:53.188	ether1
\.


--
-- TOC entry 5977 (class 0 OID 79531)
-- Dependencies: 332
-- Data for Name: VpsAlertRule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsAlertRule" (id, "vpsId", metric, threshold, "notifyEmails", "isEnabled", "lastTriggeredAt", "createdAt", "updatedAt") FROM stdin;
1	26	CPU	90	andikaferdialvianto@gmail.com	f	\N	2026-08-02 11:29:04.815	2026-08-02 11:44:28.438
2	26	RAM	90	andikaferdialvianto@gmail.com	f	\N	2026-08-02 11:29:04.831	2026-08-02 11:44:28.441
3	26	DISK	90	andikaferdialvianto@gmail.com	f	\N	2026-08-02 11:29:04.834	2026-08-02 11:44:28.442
4	27	CPU	90	andikaferdialvianto@gmail.com	f	\N	2026-08-02 11:29:04.836	2026-08-02 11:44:28.443
5	27	RAM	90	andikaferdialvianto@gmail.com	f	\N	2026-08-02 11:29:04.838	2026-08-02 11:44:28.445
6	27	DISK	90	andikaferdialvianto@gmail.com	f	\N	2026-08-02 11:29:04.84	2026-08-02 11:44:28.446
\.


--
-- TOC entry 5979 (class 0 OID 79547)
-- Dependencies: 334
-- Data for Name: VpsIpAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsIpAssignment" (id, "vpsId", "ipPoolId", "ipAddress", "isPrimary", "assignedAt", "publicIp") FROM stdin;
29	53	3	192.168.78.3	t	2026-09-23 07:22:26.97	206.237.98.230
33	57	3	192.168.78.2	t	2026-10-06 12:15:09.502	\N
\.


--
-- TOC entry 5981 (class 0 OID 79561)
-- Dependencies: 336
-- Data for Name: VpsPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsPlan" (id, name, "cpuCores", "ramGb", "diskGb", "monthlyPrice", "isActive", "createdAt", "order", "diskType", "annuallyPrice", "quarterlyPrice", "semiAnnuallyPrice", "isReseller") FROM stdin;
5	KVM-5	4	8	100	174000	t	2026-07-01 06:23:24.206	4	HDD	0	0	0	f
6	KVM-6	8	12	150	264000	t	2026-07-01 06:23:24.301	5	HDD	0	0	0	f
8	KVM-7	8	16	200	347000	t	2026-07-10 12:25:36.258	6	HDD	0	0	0	f
9	KVM-8	16	32	250	472000	t	2026-07-10 12:26:11.688	7	HDD	0	0	0	f
1	KVM-1	1	1	20	36000	t	2026-07-01 06:22:07.697	0	HDD	0	0	0	f
2	KVM-2	1	2	30	52000	t	2026-07-01 06:22:07.697	1	HDD	0	0	0	f
3	KVM-3	2	2	40	69000	t	2026-07-01 06:22:07.697	2	HDD	0	0	0	f
4	KVM-4	4	4	80	136000	t	2026-07-01 06:23:23.873	3	HDD	0	0	0	f
15	KVM-2	1	2	30	89000	t	2026-07-29 08:03:34.957	1	SSD	0	0	0	f
14	KVM-1	1	1	20	78000	t	2026-07-29 08:03:34.953	0	SSD	0	0	0	f
16	KVM-3	2	2	40	117000	t	2026-07-29 08:03:34.964	2	SSD	0	0	0	f
17	KVM-4	4	4	80	310000	t	2026-07-29 08:03:34.969	3	SSD	0	0	0	f
10	KVM-5	4	8	100	392000	t	2026-07-29 08:03:34.909	4	SSD	0	0	0	f
11	KVM-6	8	12	150	592000	t	2026-07-29 08:03:34.928	5	SSD	0	0	0	f
12	KVM-7	8	16	200	783000	t	2026-07-29 08:03:34.935	6	SSD	0	0	0	f
13	KVM-8	16	32	250	1018000	t	2026-07-29 08:03:34.941	7	SSD	0	0	0	f
\.


--
-- TOC entry 5983 (class 0 OID 79589)
-- Dependencies: 338
-- Data for Name: VpsPricing; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsPricing" (id, key, name, "pricePerHour", unit, "createdAt", "updatedAt") FROM stdin;
1	vcpu	vCPU Core	11	core	2026-07-01 05:52:29.506	2026-09-13 13:50:05.876
2	ram	RAM	40	GB	2026-07-01 05:52:29.506	2026-09-13 13:50:05.877
3	disk	Disk Storage	1	GB	2026-07-01 05:52:29.506	2026-09-13 13:50:05.878
4	ipv4	IPv4 Address	20	ip	2026-07-01 05:52:29.506	2026-09-13 13:50:05.879
5	ipv6	IPv6 Address	20	ip	2026-07-01 05:52:29.506	2026-09-13 13:50:05.88
6	backup	Backup Storage	10	GB	2026-07-01 05:52:29.506	2026-09-13 13:50:05.881
7	addon_disk	Add-on Disk	5	GB	2026-07-02 04:28:07.853	2026-09-13 13:50:05.882
8	diskSsd	SSD Storage	2	GB	2026-07-29 07:50:19.107	2026-09-13 13:50:05.883
\.


--
-- TOC entry 5985 (class 0 OID 79603)
-- Dependencies: 340
-- Data for Name: VpsSchedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsSchedule" (id, "vpsId", enabled, timezone, monday, tuesday, wednesday, thursday, friday, saturday, sunday, "startTime", "stopTime", "createdAt", "updatedAt") FROM stdin;
1	55	f	Asia/Jakarta	f	f	f	f	f	f	f	21:00	13:47	2026-09-25 14:58:19.872	2026-10-06 11:34:30.327
8	53	f	Asia/Jakarta	t	t	t	t	t	t	t	08:00	19:00	2026-10-07 08:47:51.087	2026-10-07 14:08:52.862
\.


--
-- TOC entry 5987 (class 0 OID 79636)
-- Dependencies: 342
-- Data for Name: VpsService; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsService" (id, "userId", "subscriptionId", vmid, hostname, "osTemplate", "rootPassword", "sshKey", "cpuCores", "ramGb", "diskGb", "backupGb", "backupSchedule", "lastBackupRun", status, "suspendReason", "hourlyRate", "accumulatedCost", "expiresAt", node, "networkBridge", "storageId", "kubernetesClusterId", "kubernetesRole", "createdAt", "updatedAt", "autoRenew", username, "vpcId", "vpcIp", "diskType", "terminationDate", "isReseller", "stoppedRate") FROM stdin;
1	5	\N	\N	andika.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	10	NONE	\N	TERMINATED	\N	148	-148	2026-08-25 23:52:43.061	proxmox	vmbr1	p-net	\N	\N	2026-07-25 23:52:43.07	2026-09-12 23:21:22.765	t	andika	\N	\N	HDD	\N	f	140
3	5	\N	\N	andika.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	10	NONE	\N	TERMINATED	\N	148	-148	2026-08-26 00:53:22.033	proxmox	vmbr1	p-net	\N	\N	2026-07-26 00:53:22.033	2026-09-12 23:21:22.775	t	andika	\N	\N	HDD	\N	f	140
4	5	\N	\N	andika.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	98	-98	2026-08-26 01:21:25.344	proxmox	vmbr1	p-net	\N	\N	2026-07-26 01:21:25.348	2026-09-12 23:21:22.776	t	andika	\N	\N	HDD	\N	f	90
33	5	\N	\N	masdika.tes	AlmaLinux-9.8	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	6	17	40	0	NONE	\N	TERMINATED	\N	149	5215	2026-10-03 08:41:52.162	proxmox	vmbr2	local-lvm	\N	\N	2026-09-03 08:41:52.166	2026-09-12 23:21:22.779	t	masdika	\N	\N	HDD	\N	f	57
12	5	\N	\N	subnet2.com	Debian-11	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	46	-46	2026-08-28 06:00:04.248	proxmox	vmbr1	p-net	\N	\N	2026-07-28 06:00:04.249	2026-09-12 23:21:22.781	t	andika	\N	\N	HDD	\N	f	38
15	5	\N	\N	SUBNET-2.COM	Debian-11	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	10	NONE	\N	TERMINATED	\N	146	-146	2026-08-28 11:32:02.416	proxmox	vmbr1	p-net	\N	\N	2026-07-28 11:32:02.417	2026-09-12 23:21:22.783	t	andika	\N	\N	HDD	\N	f	138
5	5	\N	\N	andika.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	102	-98	2026-08-26 01:25:19.794	proxmox	vmbr1	p-net	\N	\N	2026-07-26 01:25:19.795	2026-09-12 23:21:22.785	t	andika	\N	\N	HDD	\N	f	94
6	5	\N	\N	andika.id	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	98	-98	2026-08-27 05:38:09.09	proxmox	vmbr1	p-net	\N	\N	2026-07-27 05:38:09.097	2026-09-12 23:21:22.789	t	andika	\N	\N	HDD	\N	f	90
10	5	\N	\N	andika.subnet2.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	46	-46	2026-08-28 04:17:49.612	proxmox	vmbr1	p-net	\N	\N	2026-07-28 04:17:49.615	2026-09-12 23:21:22.791	t	andika	\N	\N	HDD	\N	f	38
7	5	\N	\N	andikates.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	96	-96	2026-08-28 02:53:12.907	proxmox	vmbr1	p-net	\N	\N	2026-07-28 02:53:12.914	2026-09-12 23:21:22.792	t	andika	\N	\N	HDD	\N	f	88
9	5	\N	\N	andika.subnet1.com	Debian-13	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	96	-96	2026-08-28 03:59:35.237	proxmox	vmbr1	p-net	\N	\N	2026-07-28 03:59:35.238	2026-09-12 23:21:22.794	t	andika	\N	\N	HDD	\N	f	88
11	5	\N	\N	subnet1.com	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	46	-46	2026-08-28 05:35:07.766	proxmox	vmbr1	p-net	\N	\N	2026-07-28 05:35:07.768	2026-09-12 23:21:22.796	t	andika	\N	\N	HDD	\N	f	38
13	5	\N	\N	SUBNET1.COM	Debian-13	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	10	NONE	\N	TERMINATED	\N	251	-251	2026-08-28 11:13:42.035	proxmox	vmbr1	p-net	\N	\N	2026-07-28 11:13:42.038	2026-09-12 23:21:22.797	t	andika	\N	\N	HDD	\N	f	243
14	5	\N	\N	SUBNET-1.COM	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	96	-96	2026-08-28 11:28:35.184	proxmox	vmbr1	p-net	\N	\N	2026-07-28 11:28:35.186	2026-09-12 23:21:22.799	t	andika	\N	\N	HDD	\N	f	88
35	5	\N	\N	ANDIKA.TES	Rocky-9.7	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	3	7	40	0	NONE	\N	TERMINATED	\N	110	300	2026-10-07 21:43:39.595	proxmox	vmbr2	hdd-2	\N	\N	2026-09-07 21:43:39.597	2026-09-12 23:21:22.801	t	andika	\N	\N	HDD	\N	f	70
17	5	\N	\N	SUBNET-2.TLD	Debian-13	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	DAILY	\N	TERMINATED	\N	96	-96	2026-08-29 01:30:41.654	proxmox	vmbr1	p-net	\N	\N	2026-07-29 01:30:41.657	2026-09-12 23:21:22.802	t	andika	\N	\N	HDD	\N	f	88
16	5	\N	\N	SUBNET-1.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	5	NONE	\N	TERMINATED	\N	96	-96	2026-08-28 23:35:40.679	proxmox	vmbr1	p-net	\N	\N	2026-07-28 23:35:40.683	2026-09-12 23:21:22.803	t	andika	\N	\N	HDD	\N	f	88
26	5	\N	\N	SUBNET-1.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	4	7	90	0	NONE	\N	TERMINATED	Failed to read node token: cat: /var/lib/rancher/k3s/server/node-token: Permission denied	588	-588	2026-08-31 11:28:00.578	proxmox	vmbr1	local-lvm	5	MASTER	2026-07-31 11:28:00.584	2026-09-12 23:21:22.804	t	andika	\N	\N	SSD	\N	f	544
24	5	\N	\N	MASTER.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	K3s install failed: Importing GPG key 0xE257814A:\n Userid     : "Rancher (CI) <ci@rancher.com>"\n Fingerprint: C8CF F216 4551 26E9 B9C9 18BE 925E A29A E257 814A\n From       : https://rpm.rancher.io/public.key\nCreated symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.\nWarning! D-Bus connection terminated.\nFailed to wait for response: Connection reset by peer	151	-151	2026-08-31 06:52:07.287	proxmox	vmbr1	p-net	3	MASTER	2026-07-31 06:52:07.298	2026-09-12 23:21:22.806	t	andika	\N	10.10.10.2	HDD	\N	f	143
21	5	\N	\N	SUBNET-1.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	10	NONE	\N	TERMINATED	\N	251	-46	2026-08-30 04:48:21.419	proxmox	vmbr1	p-net	\N	\N	2026-07-30 04:48:21.423	2026-09-12 23:21:22.808	t	andika	\N	\N	HDD	\N	f	243
25	5	\N	\N	SUBNET-1.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	Failed to connect via SSH after multiple attempts	106	-106	2026-08-31 11:24:36.201	proxmox	vmbr1	local-lvm	4	MASTER	2026-07-31 11:24:36.228	2026-09-12 23:21:22.809	t	andika	\N	10.10.10.2	SSD	\N	f	98
19	5	\N	\N	SUBNET-2.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	46	-46	2026-08-29 05:17:55.513	proxmox	vmbr1	p-net	\N	\N	2026-07-29 05:17:55.514	2026-09-12 23:21:22.811	t	andika	\N	\N	HDD	\N	f	38
18	5	\N	\N	SUBNET-1.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	46	-46	2026-08-29 04:22:18.304	proxmox	vmbr1	p-net	\N	\N	2026-07-29 04:22:18.31	2026-09-12 23:21:22.812	t	andika	\N	\N	HDD	\N	f	38
20	5	\N	\N	SUBNET-1.TLD	Debian-13	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	46	-46	2026-08-30 03:08:58.223	proxmox	vmbr1	p-net	\N	\N	2026-07-30 03:08:58.225	2026-09-12 23:21:22.815	t	andika	\N	\N	HDD	\N	f	38
22	5	\N	\N	SUBNET-1.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	256	-46	2026-08-31 03:34:13.074	proxmox	vmbr1	p-net	\N	\N	2026-07-31 03:34:13.077	2026-09-12 23:21:22.816	t	andika	\N	\N	HDD	\N	f	248
27	5	\N	\N	SUBNET-2.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCn6ua1+sw0WklThFoymzOsYJ0Zuio+NOXGNCpCTA5LYFSGJHYv+1xHCp+heMh18jY5TlWWX2YQedUlJ3drv6wyUCpHtKIRcApUQm764uZ50DdCMvkxs5i2Fxvl9lEtvneTAMiWg3UI+TGAp1p0KJZanewkDxMOyZboIjRyZlpoltJa9Fly2/IwdhA4m4E/56kjQsG9Tdt9weW4124poVJfn9GU3WPzspNWUCKZMhkrBsHrbp/pX5Tk9Gx9FWqlxLupXxGN1xvKpGWC2h+S19rsiLIMbKcvkRJbLYIRaXwySq45Zxgg2hvCxVyOaRyPf6CcxM4mNWxm491kRBGiqaDvH7FwgCqIskgwVVd/7iFmOW8F/shtBTR3VA7QgfV5G4jchkoFsM4FcQGcs9zOMzBgjdeATjdzYNp2ddg6el/hvTWYGSwcoggCDnC8jDWDUNEbJde0dVnV/fXP488lJ3Nwgh77AXZDO9qxAYPz1D/0YnsGTBl028xmLad8w5GfZcFrFZhc4Ji03wS7IuUufK3n+CplPZO1QBq8nHjCxAuXsjV60iXspYi99U0KlV0EHnM3UhYQo8L7n+hhJxJJS08Yk/aurPdedUfrwogHSs0VfoRiRk3ewychWs8dYm979IMqh2cxCAwqf6r6/JgVBsN7ZuoH5YtgbRfEpwuf2r0r3Q== (unnamed) masdika@SUBNET-2.TLD	3	4	20	0	NONE	\N	TERMINATED	\N	166	-166	2026-09-01 04:23:00.177	proxmox	vmbr1	p-net	5	WORKER	2026-08-01 04:23:00.184	2026-09-12 23:21:22.82	t	masdika	\N	\N	HDD	\N	f	138
23	5	\N	\N	MASTER.TLD	AlmaLinux-9	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	Failed to read kubeconfig	151	-151	2026-08-31 05:47:35.527	proxmox	vmbr1	p-net	2	MASTER	2026-07-31 05:47:35.542	2026-09-12 23:21:22.828	t	andika	\N	10.10.10.2	HDD	\N	f	143
29	5	\N	\N	AKUDIKA.COM	AlmaLinux-9.8	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	3	8	20	15	NONE	\N	TERMINATED	\N	293	-293	2026-09-10 03:09:58.75	proxmox	vmbr2	local-lvm	\N	\N	2026-08-10 03:09:58.752	2026-09-12 23:21:22.834	t	andika	\N	\N	HDD	\N	f	249
49	13	\N	\N	server.linuxploiter.com	Ubuntu-26.04	enc:935c0564f9deb353fa79d68f98449f7e	ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCfLcDCcy2MZYWokKU4V6G4hr9nicAxDazL8TE0wFGFnhkcL1k63g0qiGgMQx9wq4Z/s8VGlDl3RJKJs7ahLg2yTUxg/WsgG0Z88scPBULc3yqNJaMUwtwRtoUJbLXQv0PWXQHCZm68gkhUpR1++kyhxRbUIAqyNMvJdUjWxW2U/9yL2xMAIwG59NzJkB+SCtTQae03VJqrQtjXgZtWNbaCVOqihr5vBke0z6fM7Y/5R5cof9Gw1G0X46ShBAJYKXlryTZqRMCXKK78mA/zYZR5ZowdyKqwJa+PhSVfFmifu5hTCluJaLDRlxQraY1toFCxxkycnN1B++bc3H3s7BusEWaKpMNOm/B+G/Ky+gylSYM3wMGSf1otdPKaWSdmRuAaxuwvRe6ebCvN/w0HaUWmNi7sdkz8aKyQvn/xnDJSYrrUuSFR4FtmqrwL6g082m7/WGNIP/5EYt0yUJqdEoJt9By6wd5cMpBxQuGgEjwpCUoJa4dYqu5hrYFria/dB+6ue8ET11vazTAZcnyr5ovm8YgngdXOHFxIYl0frtXO4n3IoQtrBagaSWQn/nRxFYMjEFFxdQRSW7VIjOp6rXkEfqUV8h9sa45X5SNdJFpfNrLoWe8awkBMCenquqR1nqYq1n+AunHx9DCvNwWJSgAvF8k8JYOAPT5t4v7TCNNrew== (unnamed) linuxploiter@server.linuxploiter.com	1	1	20	0	NONE	\N	TERMINATED	\N	68	488	2026-10-12 18:06:05.151	proxmox	vmbr2	hdd-2	\N	\N	2026-09-12 18:06:05.154	2026-09-13 06:00:00.291	t	linuxploiter	\N	\N	HDD	\N	f	60
50	13	\N	\N	service.linuxploiter.com	Ubuntu-26.04	enc:cb2830d715a3605dae7b4e5814834615	ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCRoDneJnp46EBpX0dGqhbbSGCL+nwWYOwfMhzL10urIlhmQTOKbi5WUacaIBkn78mJfCP7xxincawxCqO4Jbsl52TGjVDt6KzOat4uL+yFrjGey7ROVZ+6FiL7/eP86spyjWXh7J0U8HI+w920dpyOzFFOzQh9Xi2cZ0PSL1uo9JbUwvoRbazwYSoksQQp9OrfUJW/8GwZwdIYGZfMXYI2QtQgZpy6GCs/rKBe8EkJfMsNAqbSa17muMRwESYuFWhUizx7Hp17/AB7M42EHSeORecb39JIbDIdTu++5IWCRerkLm+85nfcN92JficwZnSEIoN62WU7NLwJvQogMFUFkIknFDojyhrjMBuuehteDbLXzGb10txzgyHQLyFiRgrOypwDKqkMvNDgmmkYGaiOFQjQZVWqQPlx+ygH7uWLFloKI1aRLleqJ6MWvs6A7qvKpjKejd+ZFTw55FUlXYI6gwmz2q9CIQF986s2Cs8NF3k8Z0Zynug+Tj06ok65zNVA6EIgHtIo+vEPUw+0l8tZ2dMDcZaMgRCsV0vXfTxWGsiuqZ8svxVt3lbZI5cJ8mLZtHp2YtZdf3Iba1/Hv9eFrxvhxr8dQQFUK73AuPgfjr6axVZHKeonR+/a+EjyikSbCOsMnIlooJuin+0/4FtmuBrKMbGloxTmNxKb9LZdHw== (unnamed) hidayat@service.linuxploiter.com	1	1	20	0	NONE	\N	TERMINATED	\N	71	4580	2026-10-13 15:08:22.628	proxmox	vmbr2	hdd-2	\N	\N	2026-09-13 15:08:22.632	2026-09-22 04:32:23.553	t	hidayat	\N	\N	HDD	\N	f	20
51	5	\N	\N	andika.tld	AlmaLinux-10.2	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	91	182	2026-10-22 04:35:42.898	proxmox	vmbr2	hdd-2	\N	\N	2026-09-22 04:35:42.902	2026-09-22 05:51:52.333	t	andika	\N	\N	HDD	\N	f	40
52	27	\N	\N	nanda.playground.com	Ubuntu-22.04	enc:44b024a26810de960f321d1c5b0fbddf	ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCZ0X2vOCzJ7wo6WmgwmtCaSkccobEVnsXGN2jm36oWCApq8Y6V1TtqM6sEde+5FsLMULcKOFwAv2iGTmU2v1KkYXqkAzCtRUWldsgBW7RaM/rD1cmy/JmU2oEmfh9SZOvQU2e8voO4oOlAxVPTvZndTZ6D+ELZ76C7zCAsTM1iQzhgzy1jhVobfkvUuA0GCxlLnEAdf96B8C71DkMNOyg6xomOIDR6Y4hfk98TTtIqUGZHdyKgQ4+0nBmkjCri1oo5eKbNyXHWUHVtreCyiHuGzBcsMHqgcfG4kW+VX93UvPGR/ZiQtkl5YymVc8wIwtVXNh27GcnNs8SyAGMdjYKQTWST0QRMOYpqwi+DCEhhf3yC+ALPfBELw9zg5TgaSclWB+e+u5RmuQnUIpcI/BFaH5Um+/VzaUyqKnlbqvEIf1p78YqqoQnhqeqMP28nRMMlMa71X3WvbqoY34yCccCngTrkeSNEcSHcvo1X6wH7goOaQn1x3QfimH3U4DmDmkzxJrttzhx37xggVtEVzXigxDa94iHPxIVJBqciDEU7nvmaoPhZs92jiI2kvMoEvT4UUpWI+C2malDks6auzhiqFBQ+LCtVup1ZoeOZejcO6eGvsXWtZfm7yuixeTWW0a6v/LWaD8UQMW5kaUiSSR8ku00l7yzjmFHSJ3P7R54jFw== (unnamed) nanda@nanda-playground	1	1	20	0	NONE	\N	TERMINATED	\N	71	284	2026-10-23 03:57:27.101	proxmox	vmbr2	hdd-2	\N	\N	2026-09-23 03:57:27.105	2026-09-23 07:05:38.07	t	nanda	\N	\N	HDD	\N	f	20
54	5	\N	\N	andika.tes	AlmaLinux-10.2	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	71	71	2026-10-23 08:02:20.707	proxmox	vmbr2	hdd-2	\N	\N	2026-09-23 08:02:20.709	2026-09-23 08:06:55.842	t	andika	\N	\N	HDD	\N	f	20
55	5	\N	\N	andika.tld	Ubuntu-26.04	enc:d42f415bec120399f9b39610ac1b8790	\N	1	1	20	0	NONE	\N	TERMINATED	\N	91	6073	2026-10-25 08:57:19.155	proxmox	vmbr2	hdd-2	\N	\N	2026-09-25 08:57:19.158	2026-10-06 12:08:52.161	t	andika	\N	\N	HDD	\N	f	40
56	5	\N	\N	andika.tld	AlmaLinux-10.2	enc:7a2a2c72d0c614208ca5bbf06094d176	\N	1	1	20	0	NONE	\N	TERMINATED	\N	91	91	2026-11-06 12:09:48.106	proxmox	vmbr2	hdd-2	\N	\N	2026-10-06 12:09:48.108	2026-10-06 12:14:06.511	t	andika	\N	\N	HDD	\N	f	40
57	5	\N	113	andika.tld	Ubuntu-26.04	enc:18c0256cb49f688b8469549c84cc3203	\N	1	1	20	0	NONE	\N	RUNNING	\N	91	4277	2026-11-06 12:15:07.5	proxmox	vmbr2	hdd-2	\N	\N	2026-10-06 12:15:07.501	2026-10-09 00:00:00.65	t	andika	101	10.10.10.2	HDD	\N	f	40
53	27	\N	112	nanda.playground	AlmaLinux-10.2	enc:44b024a26810de960f321d1c5b0fbddf	ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQChd6iYOUGvhlnv1bzm1IY1nG/vOnYfCHTzKh9dOYo3iduIY75oOJZX8yvC+3bH4SZNP+9sGWmqMLRjWbo+JppDdAu0QGVa7vbkQ83zbDhw1M2bSVz7z1nRfmHrco9VwTQ89cK/E+gvFt4UTO7cHVETFTMAHYmTi/GAhhXCcMT212RWUTdBtXGgL1KzZx8nxDzGMe8sNgOZfkoBi0gRaFdvNtrbXI/rycZzartG8VSHleAaecc2ZxmXuabh4w154fkGNk4BC1C+KKKXOmoyPKYvRNdXBay4W8R0ywY1eTQycfXIJ079VlGm+vl+FfSQWHv1CEQE4+im/rZKqnv4y57XKdDTJ4SYulQbgXnS8k8vqg2h5SrYDBNmDXT6w0ylp2/tov7hdmhEJlR3CwSnO1nmsLPY+NcDLT/xXAn16uWInPKfHce7LGwqW7nnArW+HK/gTeuwZOhT3qnqSD99SygdlJEuDYtYsuC69Q9A6LKauPPTSW2C9GmIzLuHKT07H4Hwf4qpsWF+JHe8EG3YUtnc1tKM4ZVy5B1T8Lkc2gLUEqTXAUKJOb5lOjw+w2xWjmXZBzMgc8fPvLE0ircMVnfedtGq1XlOdJYp9zSf8RtuHYVxCZTEW5epkT0IS+a2Q+3T8KvQyrXF5a51pKSX7FAnPXafToLaRb/fvAwl8u1QJQ== (unnamed) nanda@nanda.playground	1	1	20	0	NONE	\N	RUNNING	\N	71	15157	2026-10-23 07:14:59.508	proxmox	vmbr2	hdd-2	\N	\N	2026-09-23 07:14:59.51	2026-10-09 00:00:00.625	f	nanda	100	10.0.0.2	HDD	\N	f	20
\.


--
-- TOC entry 5989 (class 0 OID 79679)
-- Dependencies: 344
-- Data for Name: VpsTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VpsTemplate" (id, vmid, name, "osType", image, "isActive", "createdAt", "updatedAt") FROM stdin;
23	1010	Rocky-9.7	l26	\N	t	2026-09-06 08:19:46.515	2026-10-06 13:18:08.157
21	1008	Ubuntu-26.04	l26	\N	t	2026-09-06 08:19:46.505	2026-10-06 13:18:08.163
9	1002	Debian-13	l26	\N	t	2026-08-10 03:08:26.621	2026-10-06 13:18:08.166
25	1007	Ubuntu-25.04	l26	\N	t	2026-09-06 08:19:46.522	2026-10-06 13:18:08.169
19	1004	Ubuntu-22.04	l26	\N	t	2026-09-06 08:19:46.498	2026-10-06 13:18:08.173
17	1006	Ubuntu-24.04	l26	\N	t	2026-09-06 08:19:46.464	2026-10-06 13:18:08.176
11	1003	Debian-11	l26	\N	t	2026-08-31 22:43:16.681	2026-10-06 13:18:08.179
10	1001	AlmaLinux-9.8	l26	\N	t	2026-08-10 03:08:26.629	2026-10-06 13:18:08.184
89	1012	FreeBSD-15.1	l26	\N	t	2026-10-06 12:29:30.246	2026-10-06 13:18:08.187
22	1009	AlmaLinux-10.2	l26	\N	t	2026-09-06 08:19:46.51	2026-10-06 13:18:08.193
88	1011	CHR-7.24.5	l26	\N	t	2026-10-06 12:29:30.242	2026-10-06 13:18:08.197
\.


--
-- TOC entry 5991 (class 0 OID 79694)
-- Dependencies: 346
-- Data for Name: WithdrawalRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WithdrawalRequest" (id, "userId", amount, status, "bankName", "accountNumber", "accountName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6062 (class 0 OID 0)
-- Dependencies: 220
-- Name: AffiliateEarning_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AffiliateEarning_id_seq"', 2, true);


--
-- TOC entry 6063 (class 0 OID 0)
-- Dependencies: 222
-- Name: Announcement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Announcement_id_seq"', 11, true);


--
-- TOC entry 6064 (class 0 OID 0)
-- Dependencies: 224
-- Name: ApiKey_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApiKey_id_seq"', 12, true);


--
-- TOC entry 6065 (class 0 OID 0)
-- Dependencies: 226
-- Name: ApiProject_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApiProject_id_seq"', 1, false);


--
-- TOC entry 6066 (class 0 OID 0)
-- Dependencies: 228
-- Name: BackgroundJob_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BackgroundJob_id_seq"', 17, true);


--
-- TOC entry 6067 (class 0 OID 0)
-- Dependencies: 230
-- Name: Banner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Banner_id_seq"', 5, true);


--
-- TOC entry 6068 (class 0 OID 0)
-- Dependencies: 232
-- Name: BlockedUser_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BlockedUser_id_seq"', 1, true);


--
-- TOC entry 6069 (class 0 OID 0)
-- Dependencies: 234
-- Name: BlogCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BlogCategory_id_seq"', 1, false);


--
-- TOC entry 6070 (class 0 OID 0)
-- Dependencies: 237
-- Name: BlogPost_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BlogPost_id_seq"', 1, true);


--
-- TOC entry 6071 (class 0 OID 0)
-- Dependencies: 239
-- Name: BlogReaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."BlogReaction_id_seq"', 6, true);


--
-- TOC entry 6072 (class 0 OID 0)
-- Dependencies: 241
-- Name: Certification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Certification_id_seq"', 1, false);


--
-- TOC entry 6073 (class 0 OID 0)
-- Dependencies: 243
-- Name: ChatMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ChatMessage_id_seq"', 66, true);


--
-- TOC entry 6074 (class 0 OID 0)
-- Dependencies: 245
-- Name: ChatSession_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ChatSession_id_seq"', 18, true);


--
-- TOC entry 6075 (class 0 OID 0)
-- Dependencies: 247
-- Name: CloudflareDomain_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CloudflareDomain_id_seq"', 10, true);


--
-- TOC entry 6076 (class 0 OID 0)
-- Dependencies: 249
-- Name: CloudflareTunnel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CloudflareTunnel_id_seq"', 16, true);


--
-- TOC entry 6077 (class 0 OID 0)
-- Dependencies: 251
-- Name: Comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Comment_id_seq"', 1, false);


--
-- TOC entry 6078 (class 0 OID 0)
-- Dependencies: 253
-- Name: CommunityGroup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CommunityGroup_id_seq"', 1, false);


--
-- TOC entry 6079 (class 0 OID 0)
-- Dependencies: 255
-- Name: CustomService_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CustomService_id_seq"', 1, false);


--
-- TOC entry 6080 (class 0 OID 0)
-- Dependencies: 257
-- Name: Education_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Education_id_seq"', 1, false);


--
-- TOC entry 6081 (class 0 OID 0)
-- Dependencies: 259
-- Name: Episode_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Episode_id_seq"', 1, false);


--
-- TOC entry 6082 (class 0 OID 0)
-- Dependencies: 261
-- Name: Experience_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Experience_id_seq"', 1, false);


--
-- TOC entry 6083 (class 0 OID 0)
-- Dependencies: 263
-- Name: Invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Invoice_id_seq"', 412, true);


--
-- TOC entry 6084 (class 0 OID 0)
-- Dependencies: 265
-- Name: IpPool_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."IpPool_id_seq"', 3, true);


--
-- TOC entry 6085 (class 0 OID 0)
-- Dependencies: 267
-- Name: KubernetesCluster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."KubernetesCluster_id_seq"', 8, true);


--
-- TOC entry 6086 (class 0 OID 0)
-- Dependencies: 269
-- Name: LoginLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."LoginLog_id_seq"', 203, true);


--
-- TOC entry 6087 (class 0 OID 0)
-- Dependencies: 271
-- Name: Message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Message_id_seq"', 8, true);


--
-- TOC entry 6088 (class 0 OID 0)
-- Dependencies: 273
-- Name: Opportunity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Opportunity_id_seq"', 1, true);


--
-- TOC entry 6089 (class 0 OID 0)
-- Dependencies: 275
-- Name: PageView_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PageView_id_seq"', 1413, true);


--
-- TOC entry 6090 (class 0 OID 0)
-- Dependencies: 277
-- Name: PaymentMethod_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PaymentMethod_id_seq"', 37, true);


--
-- TOC entry 6091 (class 0 OID 0)
-- Dependencies: 279
-- Name: Plan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Plan_id_seq"', 61, true);


--
-- TOC entry 6092 (class 0 OID 0)
-- Dependencies: 282
-- Name: ProjectCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ProjectCategory_id_seq"', 1, false);


--
-- TOC entry 6093 (class 0 OID 0)
-- Dependencies: 283
-- Name: Project_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Project_id_seq"', 1, false);


--
-- TOC entry 6094 (class 0 OID 0)
-- Dependencies: 286
-- Name: PromoClaim_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PromoClaim_id_seq"', 1, true);


--
-- TOC entry 6095 (class 0 OID 0)
-- Dependencies: 287
-- Name: Promo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Promo_id_seq"', 2, true);


--
-- TOC entry 6096 (class 0 OID 0)
-- Dependencies: 289
-- Name: ProxmoxServer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ProxmoxServer_id_seq"', 1, false);


--
-- TOC entry 6097 (class 0 OID 0)
-- Dependencies: 291
-- Name: RegistrationOtp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RegistrationOtp_id_seq"', 18, true);


--
-- TOC entry 6098 (class 0 OID 0)
-- Dependencies: 293
-- Name: ReservedIp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ReservedIp_id_seq"', 9, true);


--
-- TOC entry 6099 (class 0 OID 0)
-- Dependencies: 295
-- Name: ResetToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ResetToken_id_seq"', 4, true);


--
-- TOC entry 6100 (class 0 OID 0)
-- Dependencies: 297
-- Name: SecureMedia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SecureMedia_id_seq"', 5, true);


--
-- TOC entry 6101 (class 0 OID 0)
-- Dependencies: 299
-- Name: Series_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Series_id_seq"', 1, false);


--
-- TOC entry 6102 (class 0 OID 0)
-- Dependencies: 301
-- Name: Setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Setting_id_seq"', 614, true);


--
-- TOC entry 6103 (class 0 OID 0)
-- Dependencies: 303
-- Name: ShortLink_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ShortLink_id_seq"', 2, true);


--
-- TOC entry 6104 (class 0 OID 0)
-- Dependencies: 305
-- Name: Subscriber_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Subscriber_id_seq"', 1, false);


--
-- TOC entry 6105 (class 0 OID 0)
-- Dependencies: 307
-- Name: Subscription_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Subscription_id_seq"', 25, true);


--
-- TOC entry 6106 (class 0 OID 0)
-- Dependencies: 309
-- Name: SupportTicket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SupportTicket_id_seq"', 2, true);


--
-- TOC entry 6107 (class 0 OID 0)
-- Dependencies: 311
-- Name: Tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Tag_id_seq"', 14, true);


--
-- TOC entry 6108 (class 0 OID 0)
-- Dependencies: 313
-- Name: Testimonial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Testimonial_id_seq"', 5, true);


--
-- TOC entry 6109 (class 0 OID 0)
-- Dependencies: 315
-- Name: TicketAttachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TicketAttachment_id_seq"', 5, true);


--
-- TOC entry 6110 (class 0 OID 0)
-- Dependencies: 317
-- Name: TicketMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TicketMessage_id_seq"', 3, true);


--
-- TOC entry 6111 (class 0 OID 0)
-- Dependencies: 320
-- Name: UserVerificationOtp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."UserVerificationOtp_id_seq"', 1, false);


--
-- TOC entry 6112 (class 0 OID 0)
-- Dependencies: 321
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 58, true);


--
-- TOC entry 6113 (class 0 OID 0)
-- Dependencies: 324
-- Name: VoucherUsage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VoucherUsage_id_seq"', 1, false);


--
-- TOC entry 6114 (class 0 OID 0)
-- Dependencies: 325
-- Name: Voucher_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Voucher_id_seq"', 2, true);


--
-- TOC entry 6115 (class 0 OID 0)
-- Dependencies: 327
-- Name: VpcNetwork_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpcNetwork_id_seq"', 101, true);


--
-- TOC entry 6116 (class 0 OID 0)
-- Dependencies: 329
-- Name: VpcPeering_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpcPeering_id_seq"', 27, true);


--
-- TOC entry 6117 (class 0 OID 0)
-- Dependencies: 331
-- Name: VpcRouter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpcRouter_id_seq"', 1, true);


--
-- TOC entry 6118 (class 0 OID 0)
-- Dependencies: 333
-- Name: VpsAlertRule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsAlertRule_id_seq"', 12, true);


--
-- TOC entry 6119 (class 0 OID 0)
-- Dependencies: 335
-- Name: VpsIpAssignment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsIpAssignment_id_seq"', 33, true);


--
-- TOC entry 6120 (class 0 OID 0)
-- Dependencies: 337
-- Name: VpsPlan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsPlan_id_seq"', 17, true);


--
-- TOC entry 6121 (class 0 OID 0)
-- Dependencies: 339
-- Name: VpsPricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsPricing_id_seq"', 2, true);


--
-- TOC entry 6122 (class 0 OID 0)
-- Dependencies: 341
-- Name: VpsSchedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsSchedule_id_seq"', 10, true);


--
-- TOC entry 6123 (class 0 OID 0)
-- Dependencies: 343
-- Name: VpsService_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsService_id_seq"', 57, true);


--
-- TOC entry 6124 (class 0 OID 0)
-- Dependencies: 345
-- Name: VpsTemplate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VpsTemplate_id_seq"', 134, true);


--
-- TOC entry 6125 (class 0 OID 0)
-- Dependencies: 347
-- Name: WithdrawalRequest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."WithdrawalRequest_id_seq"', 1, false);


--
-- TOC entry 5439 (class 2606 OID 79782)
-- Name: AffiliateEarning AffiliateEarning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AffiliateEarning"
    ADD CONSTRAINT "AffiliateEarning_pkey" PRIMARY KEY (id);


--
-- TOC entry 5443 (class 2606 OID 79784)
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- TOC entry 5446 (class 2606 OID 79786)
-- Name: ApiKey ApiKey_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_pkey" PRIMARY KEY (id);


--
-- TOC entry 5451 (class 2606 OID 79788)
-- Name: ApiProject ApiProject_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiProject"
    ADD CONSTRAINT "ApiProject_pkey" PRIMARY KEY (id);


--
-- TOC entry 5454 (class 2606 OID 79790)
-- Name: BackgroundJob BackgroundJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BackgroundJob"
    ADD CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY (id);


--
-- TOC entry 5458 (class 2606 OID 79792)
-- Name: Banner Banner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Banner"
    ADD CONSTRAINT "Banner_pkey" PRIMARY KEY (id);


--
-- TOC entry 5460 (class 2606 OID 79794)
-- Name: BlockedUser BlockedUser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlockedUser"
    ADD CONSTRAINT "BlockedUser_pkey" PRIMARY KEY (id);


--
-- TOC entry 5463 (class 2606 OID 79796)
-- Name: BlogCategory BlogCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogCategory"
    ADD CONSTRAINT "BlogCategory_pkey" PRIMARY KEY (id);


--
-- TOC entry 5473 (class 2606 OID 79798)
-- Name: BlogPostTag BlogPostTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPostTag"
    ADD CONSTRAINT "BlogPostTag_pkey" PRIMARY KEY ("postId", "tagId");


--
-- TOC entry 5469 (class 2606 OID 79800)
-- Name: BlogPost BlogPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPost"
    ADD CONSTRAINT "BlogPost_pkey" PRIMARY KEY (id);


--
-- TOC entry 5476 (class 2606 OID 79802)
-- Name: BlogReaction BlogReaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogReaction"
    ADD CONSTRAINT "BlogReaction_pkey" PRIMARY KEY (id);


--
-- TOC entry 5478 (class 2606 OID 79804)
-- Name: Certification Certification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Certification"
    ADD CONSTRAINT "Certification_pkey" PRIMARY KEY (id);


--
-- TOC entry 5480 (class 2606 OID 79806)
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- TOC entry 5486 (class 2606 OID 79808)
-- Name: ChatSession ChatSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatSession"
    ADD CONSTRAINT "ChatSession_pkey" PRIMARY KEY (id);


--
-- TOC entry 5492 (class 2606 OID 79810)
-- Name: CloudflareDomain CloudflareDomain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CloudflareDomain"
    ADD CONSTRAINT "CloudflareDomain_pkey" PRIMARY KEY (id);


--
-- TOC entry 5496 (class 2606 OID 79812)
-- Name: CloudflareTunnel CloudflareTunnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CloudflareTunnel"
    ADD CONSTRAINT "CloudflareTunnel_pkey" PRIMARY KEY (id);


--
-- TOC entry 5501 (class 2606 OID 79814)
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- TOC entry 5504 (class 2606 OID 79816)
-- Name: CommunityGroup CommunityGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityGroup"
    ADD CONSTRAINT "CommunityGroup_pkey" PRIMARY KEY (id);


--
-- TOC entry 5506 (class 2606 OID 79818)
-- Name: CustomService CustomService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomService"
    ADD CONSTRAINT "CustomService_pkey" PRIMARY KEY (id);


--
-- TOC entry 5510 (class 2606 OID 79820)
-- Name: Education Education_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Education"
    ADD CONSTRAINT "Education_pkey" PRIMARY KEY (id);


--
-- TOC entry 5512 (class 2606 OID 79822)
-- Name: Episode Episode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Episode"
    ADD CONSTRAINT "Episode_pkey" PRIMARY KEY (id);


--
-- TOC entry 5515 (class 2606 OID 79824)
-- Name: Experience Experience_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Experience"
    ADD CONSTRAINT "Experience_pkey" PRIMARY KEY (id);


--
-- TOC entry 5521 (class 2606 OID 79826)
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- TOC entry 5527 (class 2606 OID 79828)
-- Name: IpPool IpPool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IpPool"
    ADD CONSTRAINT "IpPool_pkey" PRIMARY KEY (id);


--
-- TOC entry 5529 (class 2606 OID 79830)
-- Name: KubernetesCluster KubernetesCluster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KubernetesCluster"
    ADD CONSTRAINT "KubernetesCluster_pkey" PRIMARY KEY (id);


--
-- TOC entry 5532 (class 2606 OID 79832)
-- Name: LoginLog LoginLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LoginLog"
    ADD CONSTRAINT "LoginLog_pkey" PRIMARY KEY (id);


--
-- TOC entry 5534 (class 2606 OID 79834)
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- TOC entry 5536 (class 2606 OID 79836)
-- Name: Opportunity Opportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Opportunity"
    ADD CONSTRAINT "Opportunity_pkey" PRIMARY KEY (id);


--
-- TOC entry 5540 (class 2606 OID 79838)
-- Name: PageView PageView_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PageView"
    ADD CONSTRAINT "PageView_pkey" PRIMARY KEY (id);


--
-- TOC entry 5543 (class 2606 OID 79840)
-- Name: PaymentMethod PaymentMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY (id);


--
-- TOC entry 5545 (class 2606 OID 79842)
-- Name: Plan Plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Plan"
    ADD CONSTRAINT "Plan_pkey" PRIMARY KEY (id);


--
-- TOC entry 5552 (class 2606 OID 79844)
-- Name: ProjectCategory ProjectCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectCategory"
    ADD CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY (id);


--
-- TOC entry 5548 (class 2606 OID 79846)
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- TOC entry 5556 (class 2606 OID 79848)
-- Name: PromoClaim PromoClaim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PromoClaim"
    ADD CONSTRAINT "PromoClaim_pkey" PRIMARY KEY (id);


--
-- TOC entry 5554 (class 2606 OID 79850)
-- Name: Promo Promo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Promo"
    ADD CONSTRAINT "Promo_pkey" PRIMARY KEY (id);


--
-- TOC entry 5559 (class 2606 OID 79852)
-- Name: ProxmoxServer ProxmoxServer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProxmoxServer"
    ADD CONSTRAINT "ProxmoxServer_pkey" PRIMARY KEY (id);


--
-- TOC entry 5562 (class 2606 OID 79854)
-- Name: RegistrationOtp RegistrationOtp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistrationOtp"
    ADD CONSTRAINT "RegistrationOtp_pkey" PRIMARY KEY (id);


--
-- TOC entry 5565 (class 2606 OID 79856)
-- Name: ReservedIp ReservedIp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservedIp"
    ADD CONSTRAINT "ReservedIp_pkey" PRIMARY KEY (id);


--
-- TOC entry 5567 (class 2606 OID 79858)
-- Name: ResetToken ResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResetToken"
    ADD CONSTRAINT "ResetToken_pkey" PRIMARY KEY (id);


--
-- TOC entry 5571 (class 2606 OID 79860)
-- Name: SecureMedia SecureMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SecureMedia"
    ADD CONSTRAINT "SecureMedia_pkey" PRIMARY KEY (id);


--
-- TOC entry 5575 (class 2606 OID 79862)
-- Name: Series Series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Series"
    ADD CONSTRAINT "Series_pkey" PRIMARY KEY (id);


--
-- TOC entry 5579 (class 2606 OID 79864)
-- Name: Setting Setting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Setting"
    ADD CONSTRAINT "Setting_pkey" PRIMARY KEY (id);


--
-- TOC entry 5582 (class 2606 OID 79866)
-- Name: ShortLink ShortLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShortLink"
    ADD CONSTRAINT "ShortLink_pkey" PRIMARY KEY (id);


--
-- TOC entry 5587 (class 2606 OID 79868)
-- Name: Subscriber Subscriber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscriber"
    ADD CONSTRAINT "Subscriber_pkey" PRIMARY KEY (id);


--
-- TOC entry 5591 (class 2606 OID 79870)
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- TOC entry 5596 (class 2606 OID 79872)
-- Name: SupportTicket SupportTicket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportTicket"
    ADD CONSTRAINT "SupportTicket_pkey" PRIMARY KEY (id);


--
-- TOC entry 5601 (class 2606 OID 79874)
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- TOC entry 5604 (class 2606 OID 79876)
-- Name: Testimonial Testimonial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Testimonial"
    ADD CONSTRAINT "Testimonial_pkey" PRIMARY KEY (id);


--
-- TOC entry 5607 (class 2606 OID 79878)
-- Name: TicketAttachment TicketAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketAttachment"
    ADD CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY (id);


--
-- TOC entry 5609 (class 2606 OID 79880)
-- Name: TicketMessage TicketMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_pkey" PRIMARY KEY (id);


--
-- TOC entry 5618 (class 2606 OID 79882)
-- Name: UserVerificationOtp UserVerificationOtp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserVerificationOtp"
    ADD CONSTRAINT "UserVerificationOtp_pkey" PRIMARY KEY (id);


--
-- TOC entry 5615 (class 2606 OID 79884)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 5624 (class 2606 OID 79886)
-- Name: VoucherUsage VoucherUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoucherUsage"
    ADD CONSTRAINT "VoucherUsage_pkey" PRIMARY KEY (id);


--
-- TOC entry 5622 (class 2606 OID 79888)
-- Name: Voucher Voucher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Voucher"
    ADD CONSTRAINT "Voucher_pkey" PRIMARY KEY (id);


--
-- TOC entry 5627 (class 2606 OID 79890)
-- Name: VpcNetwork VpcNetwork_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcNetwork"
    ADD CONSTRAINT "VpcNetwork_pkey" PRIMARY KEY (id);


--
-- TOC entry 5631 (class 2606 OID 79892)
-- Name: VpcPeering VpcPeering_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcPeering"
    ADD CONSTRAINT "VpcPeering_pkey" PRIMARY KEY (id);


--
-- TOC entry 5634 (class 2606 OID 79894)
-- Name: VpcRouter VpcRouter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcRouter"
    ADD CONSTRAINT "VpcRouter_pkey" PRIMARY KEY (id);


--
-- TOC entry 5636 (class 2606 OID 79896)
-- Name: VpsAlertRule VpsAlertRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsAlertRule"
    ADD CONSTRAINT "VpsAlertRule_pkey" PRIMARY KEY (id);


--
-- TOC entry 5640 (class 2606 OID 79898)
-- Name: VpsIpAssignment VpsIpAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsIpAssignment"
    ADD CONSTRAINT "VpsIpAssignment_pkey" PRIMARY KEY (id);


--
-- TOC entry 5642 (class 2606 OID 79900)
-- Name: VpsPlan VpsPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsPlan"
    ADD CONSTRAINT "VpsPlan_pkey" PRIMARY KEY (id);


--
-- TOC entry 5645 (class 2606 OID 79902)
-- Name: VpsPricing VpsPricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsPricing"
    ADD CONSTRAINT "VpsPricing_pkey" PRIMARY KEY (id);


--
-- TOC entry 5647 (class 2606 OID 79904)
-- Name: VpsSchedule VpsSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsSchedule"
    ADD CONSTRAINT "VpsSchedule_pkey" PRIMARY KEY (id);


--
-- TOC entry 5652 (class 2606 OID 79906)
-- Name: VpsService VpsService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsService"
    ADD CONSTRAINT "VpsService_pkey" PRIMARY KEY (id);


--
-- TOC entry 5658 (class 2606 OID 79908)
-- Name: VpsTemplate VpsTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsTemplate"
    ADD CONSTRAINT "VpsTemplate_pkey" PRIMARY KEY (id);


--
-- TOC entry 5661 (class 2606 OID 79910)
-- Name: WithdrawalRequest WithdrawalRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WithdrawalRequest"
    ADD CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY (id);


--
-- TOC entry 5440 (class 1259 OID 79911)
-- Name: AffiliateEarning_referredId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AffiliateEarning_referredId_key" ON public."AffiliateEarning" USING btree ("referredId");


--
-- TOC entry 5441 (class 1259 OID 79912)
-- Name: AffiliateEarning_referrerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AffiliateEarning_referrerId_idx" ON public."AffiliateEarning" USING btree ("referrerId");


--
-- TOC entry 5444 (class 1259 OID 79913)
-- Name: ApiKey_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ApiKey_key_key" ON public."ApiKey" USING btree (key);


--
-- TOC entry 5447 (class 1259 OID 79914)
-- Name: ApiKey_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApiKey_projectId_idx" ON public."ApiKey" USING btree ("projectId");


--
-- TOC entry 5448 (class 1259 OID 79915)
-- Name: ApiKey_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApiKey_status_idx" ON public."ApiKey" USING btree (status);


--
-- TOC entry 5449 (class 1259 OID 79916)
-- Name: ApiKey_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApiKey_userId_idx" ON public."ApiKey" USING btree ("userId");


--
-- TOC entry 5452 (class 1259 OID 79917)
-- Name: ApiProject_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ApiProject_slug_key" ON public."ApiProject" USING btree (slug);


--
-- TOC entry 5455 (class 1259 OID 79918)
-- Name: BackgroundJob_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BackgroundJob_status_idx" ON public."BackgroundJob" USING btree (status);


--
-- TOC entry 5456 (class 1259 OID 79919)
-- Name: BackgroundJob_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BackgroundJob_type_idx" ON public."BackgroundJob" USING btree (type);


--
-- TOC entry 5461 (class 1259 OID 79920)
-- Name: BlockedUser_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BlockedUser_value_key" ON public."BlockedUser" USING btree (value);


--
-- TOC entry 5464 (class 1259 OID 79921)
-- Name: BlogCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BlogCategory_slug_key" ON public."BlogCategory" USING btree (slug);


--
-- TOC entry 5465 (class 1259 OID 79922)
-- Name: BlogPost_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_authorId_idx" ON public."BlogPost" USING btree ("authorId");


--
-- TOC entry 5466 (class 1259 OID 79923)
-- Name: BlogPost_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_categoryId_idx" ON public."BlogPost" USING btree ("categoryId");


--
-- TOC entry 5467 (class 1259 OID 79924)
-- Name: BlogPost_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_createdAt_idx" ON public."BlogPost" USING btree ("createdAt");


--
-- TOC entry 5470 (class 1259 OID 79925)
-- Name: BlogPost_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_published_idx" ON public."BlogPost" USING btree (published);


--
-- TOC entry 5471 (class 1259 OID 79926)
-- Name: BlogPost_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BlogPost_slug_key" ON public."BlogPost" USING btree (slug);


--
-- TOC entry 5474 (class 1259 OID 79927)
-- Name: BlogReaction_blogPostId_ipHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BlogReaction_blogPostId_ipHash_key" ON public."BlogReaction" USING btree ("blogPostId", "ipHash");


--
-- TOC entry 5481 (class 1259 OID 79928)
-- Name: ChatMessage_sessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_sessionId_idx" ON public."ChatMessage" USING btree ("sessionId");


--
-- TOC entry 5482 (class 1259 OID 79929)
-- Name: ChatSession_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatSession_createdAt_idx" ON public."ChatSession" USING btree ("createdAt");


--
-- TOC entry 5483 (class 1259 OID 79930)
-- Name: ChatSession_ipAddress_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatSession_ipAddress_idx" ON public."ChatSession" USING btree ("ipAddress");


--
-- TOC entry 5484 (class 1259 OID 79931)
-- Name: ChatSession_lastActiveAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatSession_lastActiveAt_idx" ON public."ChatSession" USING btree ("lastActiveAt");


--
-- TOC entry 5487 (class 1259 OID 79932)
-- Name: ChatSession_sessionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ChatSession_sessionId_key" ON public."ChatSession" USING btree ("sessionId");


--
-- TOC entry 5488 (class 1259 OID 79933)
-- Name: ChatSession_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatSession_status_idx" ON public."ChatSession" USING btree (status);


--
-- TOC entry 5489 (class 1259 OID 79934)
-- Name: CloudflareDomain_cfZoneId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CloudflareDomain_cfZoneId_key" ON public."CloudflareDomain" USING btree ("cfZoneId");


--
-- TOC entry 5490 (class 1259 OID 79935)
-- Name: CloudflareDomain_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CloudflareDomain_domain_key" ON public."CloudflareDomain" USING btree (domain);


--
-- TOC entry 5493 (class 1259 OID 79936)
-- Name: CloudflareDomain_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CloudflareDomain_userId_idx" ON public."CloudflareDomain" USING btree ("userId");


--
-- TOC entry 5494 (class 1259 OID 79937)
-- Name: CloudflareTunnel_cfTunnelId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CloudflareTunnel_cfTunnelId_key" ON public."CloudflareTunnel" USING btree ("cfTunnelId");


--
-- TOC entry 5497 (class 1259 OID 79938)
-- Name: CloudflareTunnel_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CloudflareTunnel_userId_idx" ON public."CloudflareTunnel" USING btree ("userId");


--
-- TOC entry 5498 (class 1259 OID 79939)
-- Name: Comment_blogPostId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_blogPostId_idx" ON public."Comment" USING btree ("blogPostId");


--
-- TOC entry 5499 (class 1259 OID 79940)
-- Name: Comment_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_parentId_idx" ON public."Comment" USING btree ("parentId");


--
-- TOC entry 5502 (class 1259 OID 79941)
-- Name: CommunityGroup_link_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CommunityGroup_link_key" ON public."CommunityGroup" USING btree (link);


--
-- TOC entry 5507 (class 1259 OID 79942)
-- Name: CustomService_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomService_status_idx" ON public."CustomService" USING btree (status);


--
-- TOC entry 5508 (class 1259 OID 79943)
-- Name: CustomService_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomService_userId_idx" ON public."CustomService" USING btree ("userId");


--
-- TOC entry 5513 (class 1259 OID 79944)
-- Name: Episode_seriesId_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Episode_seriesId_slug_key" ON public."Episode" USING btree ("seriesId", slug);


--
-- TOC entry 5516 (class 1259 OID 79945)
-- Name: Invoice_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_createdAt_idx" ON public."Invoice" USING btree ("createdAt");


--
-- TOC entry 5517 (class 1259 OID 79946)
-- Name: Invoice_customServiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_customServiceId_idx" ON public."Invoice" USING btree ("customServiceId");


--
-- TOC entry 5518 (class 1259 OID 79947)
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree ("invoiceNumber");


--
-- TOC entry 5519 (class 1259 OID 79948)
-- Name: Invoice_merchantOrderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_merchantOrderId_key" ON public."Invoice" USING btree ("merchantOrderId");


--
-- TOC entry 5522 (class 1259 OID 79949)
-- Name: Invoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_status_idx" ON public."Invoice" USING btree (status);


--
-- TOC entry 5523 (class 1259 OID 79950)
-- Name: Invoice_subscriptionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_subscriptionId_idx" ON public."Invoice" USING btree ("subscriptionId");


--
-- TOC entry 5524 (class 1259 OID 79951)
-- Name: Invoice_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_userId_idx" ON public."Invoice" USING btree ("userId");


--
-- TOC entry 5525 (class 1259 OID 79952)
-- Name: Invoice_vpsServiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_vpsServiceId_idx" ON public."Invoice" USING btree ("vpsServiceId");


--
-- TOC entry 5530 (class 1259 OID 79953)
-- Name: KubernetesCluster_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KubernetesCluster_userId_idx" ON public."KubernetesCluster" USING btree ("userId");


--
-- TOC entry 5537 (class 1259 OID 79954)
-- Name: Opportunity_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Opportunity_slug_key" ON public."Opportunity" USING btree (slug);


--
-- TOC entry 5538 (class 1259 OID 79955)
-- Name: PageView_ipHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PageView_ipHash_key" ON public."PageView" USING btree ("ipHash");


--
-- TOC entry 5541 (class 1259 OID 79956)
-- Name: PaymentMethod_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PaymentMethod_code_key" ON public."PaymentMethod" USING btree (code);


--
-- TOC entry 5546 (class 1259 OID 79957)
-- Name: Project_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_categoryId_idx" ON public."Project" USING btree ("categoryId");


--
-- TOC entry 5549 (class 1259 OID 79958)
-- Name: Project_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_slug_key" ON public."Project" USING btree (slug);


--
-- TOC entry 5550 (class 1259 OID 79959)
-- Name: Project_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_status_idx" ON public."Project" USING btree (status);


--
-- TOC entry 5557 (class 1259 OID 79960)
-- Name: PromoClaim_promoId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PromoClaim_promoId_userId_key" ON public."PromoClaim" USING btree ("promoId", "userId");


--
-- TOC entry 5560 (class 1259 OID 79961)
-- Name: RegistrationOtp_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RegistrationOtp_email_key" ON public."RegistrationOtp" USING btree (email);


--
-- TOC entry 5563 (class 1259 OID 79962)
-- Name: ReservedIp_ipPoolId_ipAddress_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReservedIp_ipPoolId_ipAddress_key" ON public."ReservedIp" USING btree ("ipPoolId", "ipAddress");


--
-- TOC entry 5568 (class 1259 OID 79963)
-- Name: ResetToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ResetToken_token_key" ON public."ResetToken" USING btree (token);


--
-- TOC entry 5569 (class 1259 OID 79964)
-- Name: SecureMedia_filename_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SecureMedia_filename_key" ON public."SecureMedia" USING btree (filename);


--
-- TOC entry 5572 (class 1259 OID 79965)
-- Name: SecureMedia_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SecureMedia_token_key" ON public."SecureMedia" USING btree (token);


--
-- TOC entry 5573 (class 1259 OID 79966)
-- Name: SecureMedia_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SecureMedia_userId_idx" ON public."SecureMedia" USING btree ("userId");


--
-- TOC entry 5576 (class 1259 OID 79967)
-- Name: Series_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Series_slug_key" ON public."Series" USING btree (slug);


--
-- TOC entry 5577 (class 1259 OID 79968)
-- Name: Setting_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Setting_key_key" ON public."Setting" USING btree (key);


--
-- TOC entry 5580 (class 1259 OID 79969)
-- Name: ShortLink_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ShortLink_code_key" ON public."ShortLink" USING btree (code);


--
-- TOC entry 5583 (class 1259 OID 79970)
-- Name: ShortLink_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShortLink_status_idx" ON public."ShortLink" USING btree (status);


--
-- TOC entry 5584 (class 1259 OID 79971)
-- Name: ShortLink_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShortLink_userId_idx" ON public."ShortLink" USING btree ("userId");


--
-- TOC entry 5585 (class 1259 OID 79972)
-- Name: Subscriber_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subscriber_email_key" ON public."Subscriber" USING btree (email);


--
-- TOC entry 5588 (class 1259 OID 79973)
-- Name: Subscription_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_createdAt_idx" ON public."Subscription" USING btree ("createdAt");


--
-- TOC entry 5589 (class 1259 OID 79974)
-- Name: Subscription_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_expiresAt_idx" ON public."Subscription" USING btree ("expiresAt");


--
-- TOC entry 5592 (class 1259 OID 79975)
-- Name: Subscription_planId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_planId_idx" ON public."Subscription" USING btree ("planId");


--
-- TOC entry 5593 (class 1259 OID 79976)
-- Name: Subscription_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_status_idx" ON public."Subscription" USING btree (status);


--
-- TOC entry 5594 (class 1259 OID 79977)
-- Name: Subscription_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_userId_idx" ON public."Subscription" USING btree ("userId");


--
-- TOC entry 5597 (class 1259 OID 79978)
-- Name: SupportTicket_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SupportTicket_status_idx" ON public."SupportTicket" USING btree (status);


--
-- TOC entry 5598 (class 1259 OID 79979)
-- Name: SupportTicket_ticketId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SupportTicket_ticketId_key" ON public."SupportTicket" USING btree ("ticketId");


--
-- TOC entry 5599 (class 1259 OID 79980)
-- Name: SupportTicket_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SupportTicket_userId_idx" ON public."SupportTicket" USING btree ("userId");


--
-- TOC entry 5602 (class 1259 OID 79981)
-- Name: Tag_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tag_slug_key" ON public."Tag" USING btree (slug);


--
-- TOC entry 5605 (class 1259 OID 79982)
-- Name: TicketAttachment_messageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TicketAttachment_messageId_idx" ON public."TicketAttachment" USING btree ("messageId");


--
-- TOC entry 5610 (class 1259 OID 79983)
-- Name: TicketMessage_ticketId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TicketMessage_ticketId_idx" ON public."TicketMessage" USING btree ("ticketId");


--
-- TOC entry 5611 (class 1259 OID 79984)
-- Name: TicketMessage_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TicketMessage_userId_idx" ON public."TicketMessage" USING btree ("userId");


--
-- TOC entry 5619 (class 1259 OID 79985)
-- Name: UserVerificationOtp_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserVerificationOtp_userId_idx" ON public."UserVerificationOtp" USING btree ("userId");


--
-- TOC entry 5612 (class 1259 OID 79986)
-- Name: User_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_createdAt_idx" ON public."User" USING btree ("createdAt");


--
-- TOC entry 5613 (class 1259 OID 79987)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 5616 (class 1259 OID 79988)
-- Name: User_referralCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_referralCode_key" ON public."User" USING btree ("referralCode");


--
-- TOC entry 5625 (class 1259 OID 79989)
-- Name: VoucherUsage_userId_voucherId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VoucherUsage_userId_voucherId_key" ON public."VoucherUsage" USING btree ("userId", "voucherId");


--
-- TOC entry 5620 (class 1259 OID 79990)
-- Name: Voucher_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Voucher_code_key" ON public."Voucher" USING btree (code);


--
-- TOC entry 5628 (class 1259 OID 79991)
-- Name: VpcNetwork_routerId_vlanId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpcNetwork_routerId_vlanId_key" ON public."VpcNetwork" USING btree ("routerId", "vlanId");


--
-- TOC entry 5629 (class 1259 OID 79992)
-- Name: VpcNetwork_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VpcNetwork_userId_idx" ON public."VpcNetwork" USING btree ("userId");


--
-- TOC entry 5632 (class 1259 OID 79993)
-- Name: VpcPeering_vpcAId_vpcBId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpcPeering_vpcAId_vpcBId_key" ON public."VpcPeering" USING btree ("vpcAId", "vpcBId");


--
-- TOC entry 5637 (class 1259 OID 79994)
-- Name: VpsAlertRule_vpsId_metric_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsAlertRule_vpsId_metric_key" ON public."VpsAlertRule" USING btree ("vpsId", metric);


--
-- TOC entry 5638 (class 1259 OID 79995)
-- Name: VpsIpAssignment_ipPoolId_ipAddress_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsIpAssignment_ipPoolId_ipAddress_key" ON public."VpsIpAssignment" USING btree ("ipPoolId", "ipAddress");


--
-- TOC entry 5643 (class 1259 OID 79996)
-- Name: VpsPricing_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsPricing_key_key" ON public."VpsPricing" USING btree (key);


--
-- TOC entry 5648 (class 1259 OID 79997)
-- Name: VpsSchedule_vpsId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsSchedule_vpsId_key" ON public."VpsSchedule" USING btree ("vpsId");


--
-- TOC entry 5649 (class 1259 OID 79998)
-- Name: VpsService_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VpsService_createdAt_idx" ON public."VpsService" USING btree ("createdAt");


--
-- TOC entry 5650 (class 1259 OID 79999)
-- Name: VpsService_kubernetesClusterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VpsService_kubernetesClusterId_idx" ON public."VpsService" USING btree ("kubernetesClusterId");


--
-- TOC entry 5653 (class 1259 OID 80000)
-- Name: VpsService_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VpsService_status_idx" ON public."VpsService" USING btree (status);


--
-- TOC entry 5654 (class 1259 OID 80001)
-- Name: VpsService_subscriptionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsService_subscriptionId_key" ON public."VpsService" USING btree ("subscriptionId");


--
-- TOC entry 5655 (class 1259 OID 80002)
-- Name: VpsService_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VpsService_userId_idx" ON public."VpsService" USING btree ("userId");


--
-- TOC entry 5656 (class 1259 OID 80003)
-- Name: VpsService_vmid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsService_vmid_key" ON public."VpsService" USING btree (vmid);


--
-- TOC entry 5659 (class 1259 OID 80004)
-- Name: VpsTemplate_vmid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VpsTemplate_vmid_key" ON public."VpsTemplate" USING btree (vmid);


--
-- TOC entry 5662 (class 1259 OID 80005)
-- Name: WithdrawalRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WithdrawalRequest_status_idx" ON public."WithdrawalRequest" USING btree (status);


--
-- TOC entry 5663 (class 1259 OID 80006)
-- Name: WithdrawalRequest_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WithdrawalRequest_userId_idx" ON public."WithdrawalRequest" USING btree ("userId");


--
-- TOC entry 5664 (class 2606 OID 80007)
-- Name: AffiliateEarning AffiliateEarning_referrerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AffiliateEarning"
    ADD CONSTRAINT "AffiliateEarning_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5665 (class 2606 OID 80012)
-- Name: ApiKey ApiKey_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."ApiProject"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5666 (class 2606 OID 80017)
-- Name: ApiKey ApiKey_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5669 (class 2606 OID 80022)
-- Name: BlogPostTag BlogPostTag_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPostTag"
    ADD CONSTRAINT "BlogPostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."BlogPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5670 (class 2606 OID 80027)
-- Name: BlogPostTag BlogPostTag_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPostTag"
    ADD CONSTRAINT "BlogPostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5667 (class 2606 OID 80032)
-- Name: BlogPost BlogPost_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPost"
    ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5668 (class 2606 OID 80037)
-- Name: BlogPost BlogPost_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPost"
    ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."BlogCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5671 (class 2606 OID 80042)
-- Name: BlogReaction BlogReaction_blogPostId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogReaction"
    ADD CONSTRAINT "BlogReaction_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES public."BlogPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5672 (class 2606 OID 80047)
-- Name: ChatMessage ChatMessage_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."ChatSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5673 (class 2606 OID 80052)
-- Name: CloudflareDomain CloudflareDomain_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CloudflareDomain"
    ADD CONSTRAINT "CloudflareDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5674 (class 2606 OID 80057)
-- Name: CloudflareTunnel CloudflareTunnel_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CloudflareTunnel"
    ADD CONSTRAINT "CloudflareTunnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5675 (class 2606 OID 80062)
-- Name: Comment Comment_blogPostId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES public."BlogPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5676 (class 2606 OID 80067)
-- Name: Comment Comment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5677 (class 2606 OID 80072)
-- Name: CustomService CustomService_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomService"
    ADD CONSTRAINT "CustomService_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5678 (class 2606 OID 80077)
-- Name: Episode Episode_seriesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Episode"
    ADD CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES public."Series"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5679 (class 2606 OID 80082)
-- Name: Invoice Invoice_customServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_customServiceId_fkey" FOREIGN KEY ("customServiceId") REFERENCES public."CustomService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5680 (class 2606 OID 80087)
-- Name: Invoice Invoice_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5681 (class 2606 OID 80092)
-- Name: Invoice Invoice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5682 (class 2606 OID 80097)
-- Name: Invoice Invoice_vpsServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_vpsServiceId_fkey" FOREIGN KEY ("vpsServiceId") REFERENCES public."VpsService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5683 (class 2606 OID 80102)
-- Name: KubernetesCluster KubernetesCluster_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KubernetesCluster"
    ADD CONSTRAINT "KubernetesCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5684 (class 2606 OID 80107)
-- Name: Project Project_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProjectCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5685 (class 2606 OID 80112)
-- Name: PromoClaim PromoClaim_promoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PromoClaim"
    ADD CONSTRAINT "PromoClaim_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES public."Promo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5686 (class 2606 OID 80117)
-- Name: PromoClaim PromoClaim_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PromoClaim"
    ADD CONSTRAINT "PromoClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5687 (class 2606 OID 80122)
-- Name: ReservedIp ReservedIp_ipPoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservedIp"
    ADD CONSTRAINT "ReservedIp_ipPoolId_fkey" FOREIGN KEY ("ipPoolId") REFERENCES public."IpPool"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5688 (class 2606 OID 80127)
-- Name: ReservedIp ReservedIp_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservedIp"
    ADD CONSTRAINT "ReservedIp_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5689 (class 2606 OID 80132)
-- Name: ReservedIp ReservedIp_vpsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservedIp"
    ADD CONSTRAINT "ReservedIp_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES public."VpsService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5690 (class 2606 OID 80137)
-- Name: ResetToken ResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResetToken"
    ADD CONSTRAINT "ResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5691 (class 2606 OID 80142)
-- Name: SecureMedia SecureMedia_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SecureMedia"
    ADD CONSTRAINT "SecureMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5692 (class 2606 OID 80147)
-- Name: ShortLink ShortLink_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShortLink"
    ADD CONSTRAINT "ShortLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5693 (class 2606 OID 80152)
-- Name: Subscription Subscription_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."Plan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5694 (class 2606 OID 80157)
-- Name: Subscription Subscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5695 (class 2606 OID 80162)
-- Name: SupportTicket SupportTicket_mergedIntoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportTicket"
    ADD CONSTRAINT "SupportTicket_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES public."SupportTicket"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5696 (class 2606 OID 80167)
-- Name: SupportTicket SupportTicket_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportTicket"
    ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5697 (class 2606 OID 80172)
-- Name: TicketAttachment TicketAttachment_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketAttachment"
    ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."TicketMessage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5698 (class 2606 OID 80177)
-- Name: TicketMessage TicketMessage_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."SupportTicket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5699 (class 2606 OID 80182)
-- Name: TicketMessage TicketMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5701 (class 2606 OID 80187)
-- Name: UserVerificationOtp UserVerificationOtp_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserVerificationOtp"
    ADD CONSTRAINT "UserVerificationOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5700 (class 2606 OID 80192)
-- Name: User User_referredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5702 (class 2606 OID 80197)
-- Name: VoucherUsage VoucherUsage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoucherUsage"
    ADD CONSTRAINT "VoucherUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5703 (class 2606 OID 80202)
-- Name: VoucherUsage VoucherUsage_voucherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoucherUsage"
    ADD CONSTRAINT "VoucherUsage_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES public."Voucher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5704 (class 2606 OID 80207)
-- Name: VpcNetwork VpcNetwork_routerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcNetwork"
    ADD CONSTRAINT "VpcNetwork_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES public."VpcRouter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5705 (class 2606 OID 80212)
-- Name: VpcNetwork VpcNetwork_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcNetwork"
    ADD CONSTRAINT "VpcNetwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5706 (class 2606 OID 80217)
-- Name: VpcPeering VpcPeering_vpcAId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcPeering"
    ADD CONSTRAINT "VpcPeering_vpcAId_fkey" FOREIGN KEY ("vpcAId") REFERENCES public."VpcNetwork"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5707 (class 2606 OID 80222)
-- Name: VpcPeering VpcPeering_vpcBId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpcPeering"
    ADD CONSTRAINT "VpcPeering_vpcBId_fkey" FOREIGN KEY ("vpcBId") REFERENCES public."VpcNetwork"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5708 (class 2606 OID 80227)
-- Name: VpsAlertRule VpsAlertRule_vpsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsAlertRule"
    ADD CONSTRAINT "VpsAlertRule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES public."VpsService"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5709 (class 2606 OID 80232)
-- Name: VpsIpAssignment VpsIpAssignment_ipPoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsIpAssignment"
    ADD CONSTRAINT "VpsIpAssignment_ipPoolId_fkey" FOREIGN KEY ("ipPoolId") REFERENCES public."IpPool"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5710 (class 2606 OID 80237)
-- Name: VpsIpAssignment VpsIpAssignment_vpsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsIpAssignment"
    ADD CONSTRAINT "VpsIpAssignment_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES public."VpsService"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5711 (class 2606 OID 80242)
-- Name: VpsSchedule VpsSchedule_vpsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsSchedule"
    ADD CONSTRAINT "VpsSchedule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES public."VpsService"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5712 (class 2606 OID 80247)
-- Name: VpsService VpsService_kubernetesClusterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsService"
    ADD CONSTRAINT "VpsService_kubernetesClusterId_fkey" FOREIGN KEY ("kubernetesClusterId") REFERENCES public."KubernetesCluster"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5713 (class 2606 OID 80252)
-- Name: VpsService VpsService_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsService"
    ADD CONSTRAINT "VpsService_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5714 (class 2606 OID 80257)
-- Name: VpsService VpsService_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsService"
    ADD CONSTRAINT "VpsService_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5715 (class 2606 OID 80262)
-- Name: VpsService VpsService_vpcId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VpsService"
    ADD CONSTRAINT "VpsService_vpcId_fkey" FOREIGN KEY ("vpcId") REFERENCES public."VpcNetwork"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5716 (class 2606 OID 80267)
-- Name: WithdrawalRequest WithdrawalRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WithdrawalRequest"
    ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


-- Completed on 2026-10-09 07:18:40

--
-- PostgreSQL database dump complete
--


