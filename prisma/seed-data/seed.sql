-- Dock Scheduling System — seed data
-- Exported from local dev DB on 2026-03-04
-- Run after: pnpm prisma migrate deploy
-- Usage: psql -U postgres -d timeslotcontrol -f prisma/seed-data/seed.sql
-- All user passwords: "password123" (bcrypt hash)

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ─── Clients ─────────────────────────────────────────────────────────────────

ALTER TABLE public.client DISABLE TRIGGER ALL;

INSERT INTO public.client (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('client-allegro', 'Allegro', 'warehouse@allegro.cz', '2026-03-02 19:55:35.061', '2026-03-02 19:55:35.061');
INSERT INTO public.client (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('cmm9rxiye00006wl53ybc7hao', 'Online Empire s.r.o.', 'trade@nejkafe.cz', '2026-03-02 22:52:10.934', '2026-03-02 22:52:10.934');

ALTER TABLE public.client ENABLE TRIGGER ALL;

-- ─── Suppliers ───────────────────────────────────────────────────────────────

ALTER TABLE public.supplier DISABLE TRIGGER ALL;

INSERT INTO public.supplier (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('supplier-pg', 'Procter & Gamble', 'logistics@pg.com', '2026-03-02 19:55:35.377', '2026-03-02 19:55:35.377');
INSERT INTO public.supplier (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('cmm9ryald00036wl5tvj8lau3', 'Jarda z Jicina', 'jarda@jicin.cz', '2026-03-02 22:52:46.616', '2026-03-02 22:52:46.616');

ALTER TABLE public.supplier ENABLE TRIGGER ALL;

-- ─── Warehouses ──────────────────────────────────────────────────────────────

ALTER TABLE public.warehouse DISABLE TRIGGER ALL;

INSERT INTO public.warehouse (id, name, address, timezone, "isActive", "createdAt", "updatedAt") VALUES ('warehouse-01', 'Sklad Praha', 'Průmyslová 1, 150 00 Praha', 'Europe/Prague', true, '2026-03-02 19:55:34.736', '2026-03-02 19:55:34.736');
INSERT INTO public.warehouse (id, name, address, timezone, "isActive", "createdAt", "updatedAt") VALUES ('cmmbzp06j000ktar8nhcwb6yx', 'Ústí nad Labem', 'hezká', 'Europe/Prague', true, '2026-03-04 12:05:02.635', '2026-03-04 12:05:02.635');

ALTER TABLE public.warehouse ENABLE TRIGGER ALL;

-- ─── Users ───────────────────────────────────────────────────────────────────
-- All passwords: "password123"

ALTER TABLE public."user" DISABLE TRIGGER ALL;

INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9lmev00000aor83glufiiw', 'admin@timeslotcontrol.com', 'Administrator', '$2b$12$JPeM2glcPNU4rcvtBSCiCOZzN.duPIbptnUGNu.wVbEb4iH9/6kfO', 'ADMIN', NULL, NULL, true, '2026-03-02 19:55:34.6', '2026-03-02 19:55:34.6', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9lmf3p0001aor8logp6kqt', 'worker@timeslotcontrol.com', 'Pracovník Skladu Praha', '$2b$12$4HDBy6IaSIRnOQlIJ82ixe4nTVeYAUvCjh9VvxglhD5LLByLfBS3y', 'WAREHOUSE_WORKER', NULL, NULL, true, '2026-03-02 19:55:35.027', '2026-03-04 12:20:08.666', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9lmfda000gaor8c8moao65', 'allegro@timeslotcontrol.com', 'Allegro Manager', '$2b$12$AcLWl/6Bj4shlWLlrA/C1eE2VMgesFRF35G66r.OKeN1sB9NYu2jm', 'CLIENT', 'client-allegro', NULL, true, '2026-03-02 19:55:35.374', '2026-03-04 12:20:18.126', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9lmfld000haor8udm1qqah', 'pg@timeslotcontrol.com', 'P&G Logistics', '$2b$12$1jruTiP/L3w7LlveZ9EpPe5BC76vlvJBdAUm1BzKMLxARXQJk0OSe', 'SUPPLIER', NULL, 'supplier-pg', true, '2026-03-02 19:55:35.664', '2026-03-04 12:19:53.147', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9rz1bx00056wl50fvl9c9z', 'jarda@jicin.cz', 'Jarda Okurka', '$2b$12$1XnM7UqwNMFaJqCRQQ.2Z.CQuI34HNPW37LcAjoUAKBmYNEySrnRm', 'SUPPLIER', NULL, 'cmm9ryald00036wl5tvj8lau3', true, '2026-03-02 22:53:21.405', '2026-03-04 12:19:46.027', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9val4b0005mol562c8fkx8', 'alex@nejkafe.cz', 'Alex Baran', '$2b$12$q74GkpLdGrPF4HTwQ3ZFy.QjBIlfHEBjSowegC8sgGNWmkXqL24D2', 'CLIENT', 'cmm9rxiye00006wl53ybc7hao', NULL, true, '2026-03-03 00:26:19.115', '2026-03-04 12:20:22.642', false, true, true);

ALTER TABLE public."user" ENABLE TRIGGER ALL;

-- ─── User-Warehouse assignments ─────────────────────────────────────────────

ALTER TABLE public.user_warehouse DISABLE TRIGGER ALL;

INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9lmf3p0001aor8logp6kqt', 'warehouse-01');
INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9lmfld000haor8udm1qqah', 'warehouse-01');
INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9rz1bx00056wl50fvl9c9z', 'warehouse-01');
INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9lmfda000gaor8c8moao65', 'warehouse-01');
INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9lmfda000gaor8c8moao65', 'cmmbzp06j000ktar8nhcwb6yx');
INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9val4b0005mol562c8fkx8', 'warehouse-01');

ALTER TABLE public.user_warehouse ENABLE TRIGGER ALL;

-- ─── Client-Supplier relationships ───────────────────────────────────────────

ALTER TABLE public.client_supplier DISABLE TRIGGER ALL;

INSERT INTO public.client_supplier ("clientId", "supplierId") VALUES ('client-allegro', 'supplier-pg');
INSERT INTO public.client_supplier ("clientId", "supplierId") VALUES ('cmm9rxiye00006wl53ybc7hao', 'supplier-pg');
INSERT INTO public.client_supplier ("clientId", "supplierId") VALUES ('cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3');

ALTER TABLE public.client_supplier ENABLE TRIGGER ALL;

-- ─── Gates ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gate DISABLE TRIGGER ALL;

INSERT INTO public.gate (id, "warehouseId", name, description, "isActive", "createdAt", "updatedAt") VALUES ('gate-01', 'warehouse-01', 'Rampa 1', 'Hlavní vykládková rampa', true, '2026-03-02 19:55:35.033', '2026-03-02 19:55:35.033');
INSERT INTO public.gate (id, "warehouseId", name, description, "isActive", "createdAt", "updatedAt") VALUES ('gate-02', 'warehouse-01', 'Rampa 2', 'Vedlejší rampa', true, '2026-03-02 19:55:35.037', '2026-03-02 19:55:35.037');
INSERT INTO public.gate (id, "warehouseId", name, description, "isActive", "createdAt", "updatedAt") VALUES ('cmmbzpy17000ptar8d0odb2un', 'cmmbzp06j000ktar8nhcwb6yx', 'Rampa 1', NULL, true, '2026-03-04 12:05:46.507', '2026-03-04 12:05:46.507');

ALTER TABLE public.gate ENABLE TRIGGER ALL;

-- ─── Gate Opening Hours ──────────────────────────────────────────────────────

ALTER TABLE public.gate_opening_hours DISABLE TRIGGER ALL;

INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf410002aor8uzrn1mye', 'gate-01', 0, '06:00', '18:00', false);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf450003aor8d0on9117', 'gate-01', 1, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf470004aor8m0kszelp', 'gate-01', 2, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf480005aor88t22a9n9', 'gate-01', 3, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf490006aor8scyod9qg', 'gate-01', 4, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4b0007aor8ug2pplke', 'gate-01', 5, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4c0008aor8yf8wbhtn', 'gate-01', 6, '07:00', '13:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4d0009aor8z4amo4ji', 'gate-02', 0, '06:00', '18:00', false);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4f000aaor8n6gqjujw', 'gate-02', 1, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4g000baor81s5lgdip', 'gate-02', 2, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4h000caor8rneg3y6v', 'gate-02', 3, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4i000daor87fkw0h24', 'gate-02', 4, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4j000eaor8ndnsk7jg', 'gate-02', 5, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9lmf4k000faor8qcah06hn', 'gate-02', 6, '07:00', '13:00', true);

ALTER TABLE public.gate_opening_hours ENABLE TRIGGER ALL;

-- ─── Transport Units ─────────────────────────────────────────────────────────

ALTER TABLE public.transport_unit DISABLE TRIGGER ALL;

INSERT INTO public.transport_unit (id, name, "weightKg", "processingMinutes", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES ('tu-eur', 'EUR paleta', 20.00, 4, true, 1, '2026-03-02 23:32:28.974', '2026-03-02 23:32:28.974');
INSERT INTO public.transport_unit (id, name, "weightKg", "processingMinutes", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES ('tu-oneway', 'Jednorazova paleta', 15.00, 4, true, 2, '2026-03-02 23:32:28.979', '2026-03-02 23:32:28.979');
INSERT INTO public.transport_unit (id, name, "weightKg", "processingMinutes", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES ('tu-other-pal', 'Jina paleta', 15.00, 4, true, 3, '2026-03-02 23:32:28.98', '2026-03-02 23:32:28.98');
INSERT INTO public.transport_unit (id, name, "weightKg", "processingMinutes", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES ('tu-carton', 'Karton', 1.00, 1, true, 4, '2026-03-02 23:32:28.982', '2026-03-02 23:32:28.982');
INSERT INTO public.transport_unit (id, name, "weightKg", "processingMinutes", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES ('tu-other', 'Jine', 0.00, 2, true, 5, '2026-03-02 23:32:28.984', '2026-03-02 23:32:28.984');

ALTER TABLE public.transport_unit ENABLE TRIGGER ALL;

-- ─── Reservations (triggers disabled for circular FK) ────────────────────────

ALTER TABLE public.reservation DISABLE TRIGGER ALL;

INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmm9v5ba80000mol54zfewuw2', 'gate-01', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'CLOSED', 'cmm9v5bab0001mol5nevxjxhi', NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 00:22:13.087', '2026-03-03 00:53:25.053');
INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmm9vy0qp0007mol534jyjlik', 'gate-01', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'CONFIRMED', 'cmm9vy0qt0008mol5hmpiidcm', NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 00:44:32.448', '2026-03-03 01:19:22.67');
INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmmao9e4i000077r8aq28h6sd', 'gate-02', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'CLOSED', 'cmmao9e4n000177r8suqmyn5l', NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 13:57:12.257', '2026-03-03 13:58:38.093');
INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmmaomloq000m77r86mnnhkd5', 'gate-01', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'REQUESTED', NULL, 'cmmaomlot000n77r8f801ieq9', 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 14:07:28.586', '2026-03-03 14:07:28.591');
INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmmbxw1hd0000tar8lyks0dwe', 'gate-01', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'UNLOADING_COMPLETED', 'cmmbxw1hj0001tar8cjocq5bz', NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-04 11:14:31.681', '2026-03-04 11:16:46.529');
INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmmbz5tag000etar8r3xgv4fa', 'gate-01', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'REQUESTED', NULL, 'cmmbz5tap000ftar828k28kk5', 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-04 11:50:07.239', '2026-03-04 11:50:07.253');
INSERT INTO public.reservation (id, "gateId", "clientId", "supplierId", status, "confirmedVersionId", "pendingVersionId", "createdById", "createdAt", "updatedAt") VALUES ('cmmaolmm4000h77r8hb4qykus', 'gate-01', 'cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3', 'CLOSED', 'cmmaolmm9000i77r8jy6a3h93', NULL, 'cmm9lmev00000aor83glufiiw', '2026-03-03 14:06:43.13', '2026-03-04 12:29:22.357');

ALTER TABLE public.reservation ENABLE TRIGGER ALL;

-- ─── Reservation Versions ────────────────────────────────────────────────────

ALTER TABLE public.reservation_version DISABLE TRIGGER ALL;

INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmm9v5bab0001mol5nevxjxhi', 'cmm9v5ba80000mol54zfewuw2', '2026-03-03 07:00:00', 45, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 00:22:13.087');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmm9vy0qt0008mol5hmpiidcm', 'cmm9vy0qp0007mol534jyjlik', '2026-03-03 07:45:00', 15, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 00:44:32.448');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmmao9e4n000177r8suqmyn5l', 'cmmao9e4i000077r8aq28h6sd', '2026-03-03 14:30:00', 30, 'TRUCK', '1ACV911', 'ASDYXC', 'Jarda Kužel', NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 13:57:12.257');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmmaolmm9000i77r8jy6a3h93', 'cmmaolmm4000h77r8hb4qykus', '2026-03-03 14:45:00', 60, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9lmev00000aor83glufiiw', '2026-03-03 14:06:43.13');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmmaomlot000n77r8f801ieq9', 'cmmaomloq000m77r86mnnhkd5', '2026-03-03 15:30:00', 15, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 14:07:28.586');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmmbxw1hj0001tar8cjocq5bz', 'cmmbxw1hd0000tar8lyks0dwe', '2026-03-04 13:30:00', 45, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-04 11:14:31.681');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmmbz5tap000ftar828k28kk5', 'cmmbz5tag000etar8r3xgv4fa', '2026-03-04 09:30:00', 15, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-04 11:50:07.239');

ALTER TABLE public.reservation_version ENABLE TRIGGER ALL;

-- ─── Reservation Items ───────────────────────────────────────────────────────

ALTER TABLE public.reservation_item DISABLE TRIGGER ALL;

INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmm9v5bac0002mol5ccuihwyn', 'cmm9v5bab0001mol5nevxjxhi', 8, 'Lego', 200.00, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmm9vy0qv0009mol5v33ioswr', 'cmm9vy0qt0008mol5hmpiidcm', 1, NULL, NULL, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmmao9e4o000277r89coes7sa', 'cmmao9e4n000177r8suqmyn5l', 7, 'Lego', 100.00, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmmaolmmb000j77r89rtgb7mx', 'cmmaolmm9000i77r8jy6a3h93', 14, NULL, 20.00, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmmaomlot000o77r8xcv1v81a', 'cmmaomlot000n77r8f801ieq9', 1, NULL, 40.00, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmmbxw1hk0002tar89sbxq3yj', 'cmmbxw1hj0001tar8cjocq5bz', 9, NULL, 10.00, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmmbz5taq000gtar8mxtna82w', 'cmmbz5tap000ftar828k28kk5', 1, NULL, NULL, 'tu-eur');

ALTER TABLE public.reservation_item ENABLE TRIGGER ALL;

-- ─── Reservation Status Changes ──────────────────────────────────────────────

ALTER TABLE public.reservation_status_change DISABLE TRIGGER ALL;

INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmm9v5ba80000mol54zfewuw2', 'cmm9v5ba80000mol54zfewuw2', 'CLOSED', '2026-03-03 00:22:13.087', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmm9vy0qp0007mol534jyjlik', 'cmm9vy0qp0007mol534jyjlik', 'CONFIRMED', '2026-03-03 00:44:32.448', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmmao9e4i000077r8aq28h6sd', 'cmmao9e4i000077r8aq28h6sd', 'CLOSED', '2026-03-03 13:57:12.257', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmmaolmm4000h77r8hb4qykus', 'cmmaolmm4000h77r8hb4qykus', 'CONFIRMED', '2026-03-03 14:06:43.13', 'cmm9lmev00000aor83glufiiw');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmmaomloq000m77r86mnnhkd5', 'cmmaomloq000m77r86mnnhkd5', 'REQUESTED', '2026-03-03 14:07:28.586', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmmbxw1hd0000tar8lyks0dwe', 'cmmbxw1hd0000tar8lyks0dwe', 'UNLOADING_COMPLETED', '2026-03-04 11:14:31.681', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc_init_cmmbz5tag000etar8r3xgv4fa', 'cmmbz5tag000etar8r3xgv4fa', 'REQUESTED', '2026-03-04 11:50:07.239', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('cmmc0k7eq0001e8r81chnjlw3', 'cmmaolmm4000h77r8hb4qykus', 'UNLOADING_STARTED', '2026-03-04 12:29:18.338', 'cmm9lmev00000aor83glufiiw');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('cmmc0k8rz0005e8r8pxory1mh', 'cmmaolmm4000h77r8hb4qykus', 'UNLOADING_COMPLETED', '2026-03-04 12:29:20.111', 'cmm9lmev00000aor83glufiiw');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('cmmc0kaih0009e8r8lsbfy685', 'cmmaolmm4000h77r8hb4qykus', 'CLOSED', '2026-03-04 12:29:22.361', 'cmm9lmev00000aor83glufiiw');

ALTER TABLE public.reservation_status_change ENABLE TRIGGER ALL;

-- ─── Notifications ───────────────────────────────────────────────────────────

ALTER TABLE public.notification DISABLE TRIGGER ALL;

INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmao9e6n000477r8kpss88ix', 'cmm9lmf3p0001aor8logp6kqt', 'RESERVATION_CREATED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Jarda z Jicina — 3. 3. 2026 15:30:00', false, '2026-03-03 13:57:12.334');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaoa4m8000677r897sq5s8q', 'cmm9rz1bx00056wl50fvl9c9z', 'RESERVATION_APPROVED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', '3. 3. 2026 15:30:00', true, '2026-03-03 13:57:46.592');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaoa4m8000777r8q45zuica', 'cmm9val4b0005mol562c8fkx8', 'RESERVATION_APPROVED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', '3. 3. 2026 15:30:00', false, '2026-03-03 13:57:46.592');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaoao55000977r8rcvv4mui', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Vykládka zahájena', true, '2026-03-03 13:58:11.888');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaoao55000a77r8r8lvjttt', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Vykládka zahájena', false, '2026-03-03 13:58:11.888');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaoazay000c77r80vclen5v', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Vykládka dokončena', true, '2026-03-03 13:58:26.361');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaoazay000d77r8nmoeh28t', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Vykládka dokončena', false, '2026-03-03 13:58:26.361');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaob8dt000f77r8c19ac7na', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Uzavřeno', true, '2026-03-03 13:58:38.128');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaob8dt000g77r8jzff92pf', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmao9e4i000077r8aq28h6sd', 'Rampa 2', 'Uzavřeno', false, '2026-03-03 13:58:38.128');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaolmnn000l77r8qic3wh1p', 'cmm9lmf3p0001aor8logp6kqt', 'RESERVATION_CREATED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Jarda z Jicina — 3. 3. 2026 15:45:00', false, '2026-03-03 14:06:43.186');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmaomlpj000q77r8or3ucxl5', 'cmm9lmf3p0001aor8logp6kqt', 'RESERVATION_CREATED', 'cmmaomloq000m77r86mnnhkd5', 'Rampa 1', 'Jarda z Jicina — 3. 3. 2026 16:30:00', false, '2026-03-03 14:07:28.615');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxw1jf0004tar8ts8bq05b', 'cmm9lmf3p0001aor8logp6kqt', 'RESERVATION_CREATED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', 'Jarda z Jicina — 4. 3. 2026 14:30:00', false, '2026-03-04 11:14:31.753');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxw5o90006tar8232gv7hj', 'cmm9rz1bx00056wl50fvl9c9z', 'RESERVATION_APPROVED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', '4. 3. 2026 14:30:00', true, '2026-03-04 11:14:37.11');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxw5o90007tar82j7v6us3', 'cmm9val4b0005mol562c8fkx8', 'RESERVATION_APPROVED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', '4. 3. 2026 14:30:00', false, '2026-03-04 11:14:37.11');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxyvtr0009tar8k6ennex1', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', 'Vykládka zahájena', false, '2026-03-04 11:16:44.318');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxyvts000atar89o8ujfgu', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', 'Vykládka zahájena', false, '2026-03-04 11:16:44.318');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxyxjv000ctar8k32smopt', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', 'Vykládka dokončena', false, '2026-03-04 11:16:46.554');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbxyxjv000dtar8nx7oas5c', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmbxw1hd0000tar8lyks0dwe', 'Rampa 1', 'Vykládka dokončena', false, '2026-03-04 11:16:46.554');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbz5tby000itar8hivgvzh7', 'cmm9lmev00000aor83glufiiw', 'RESERVATION_CREATED', 'cmmbz5tag000etar8r3xgv4fa', 'Rampa 1', 'Jarda z Jicina — 4. 3. 2026 10:30:00', true, '2026-03-04 11:50:07.293');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmbz5tby000jtar8a21qr3pg', 'cmm9lmf3p0001aor8logp6kqt', 'RESERVATION_CREATED', 'cmmbz5tag000etar8r3xgv4fa', 'Rampa 1', 'Jarda z Jicina — 4. 3. 2026 10:30:00', false, '2026-03-04 11:50:07.293');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmc0k7fm0002e8r8z4ed7bql', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Vykládka zahájena', false, '2026-03-04 12:29:18.368');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmc0k7fm0003e8r8cnq0lybp', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Vykládka zahájena', false, '2026-03-04 12:29:18.368');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmc0k8sm0006e8r855do4nkz', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Vykládka dokončena', false, '2026-03-04 12:29:20.133');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmc0k8sm0007e8r8bz6g5m2z', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Vykládka dokončena', false, '2026-03-04 12:29:20.133');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmc0kajc000ae8r8aoc44q7y', 'cmm9rz1bx00056wl50fvl9c9z', 'STATUS_CHANGED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Uzavřeno', false, '2026-03-04 12:29:22.391');
INSERT INTO public.notification (id, "userId", type, "reservationId", title, message, "isRead", "createdAt") VALUES ('cmmc0kajc000be8r821iu7h50', 'cmm9val4b0005mol562c8fkx8', 'STATUS_CHANGED', 'cmmaolmm4000h77r8hb4qykus', 'Rampa 1', 'Uzavřeno', false, '2026-03-04 12:29:22.391');

ALTER TABLE public.notification ENABLE TRIGGER ALL;

-- ─── Audit Log ───────────────────────────────────────────────────────────────

ALTER TABLE public.audit_log DISABLE TRIGGER ALL;

INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmao9e53000377r8q9v6zxlf', 'reservation', 'cmmao9e4i000077r8aq28h6sd', 'created', NULL, '{"status": "REQUESTED", "startTime": "2026-03-03T14:30:00.000Z", "durationMinutes": 30}', 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 13:57:12.278');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmaoa4l2000577r8blk7u2nb', 'reservation', 'cmmao9e4i000077r8aq28h6sd', 'version_approved', '{"status": "REQUESTED"}', '{"status": "CONFIRMED", "confirmedVersionId": "cmmao9e4n000177r8suqmyn5l"}', 'cmm9lmev00000aor83glufiiw', '2026-03-03 13:57:46.55');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmaoao35000877r8ho40sasu', 'reservation', 'cmmao9e4i000077r8aq28h6sd', 'status_changed', '{"status": "CONFIRMED"}', '{"status": "UNLOADING_STARTED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-03 13:58:11.825');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmaoaz9z000b77r8akf50g3j', 'reservation', 'cmmao9e4i000077r8aq28h6sd', 'status_changed', '{"status": "UNLOADING_STARTED"}', '{"status": "UNLOADING_COMPLETED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-03 13:58:26.327');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmaob8cw000e77r8ameqbb14', 'reservation', 'cmmao9e4i000077r8aq28h6sd', 'status_changed', '{"status": "UNLOADING_COMPLETED"}', '{"status": "CLOSED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-03 13:58:38.096');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmaolmmi000k77r8qr7m8qht', 'reservation', 'cmmaolmm4000h77r8hb4qykus', 'created', NULL, '{"status": "CONFIRMED", "startTime": "2026-03-03T14:45:00.000Z", "durationMinutes": 60}', 'cmm9lmev00000aor83glufiiw', '2026-03-03 14:06:43.146');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmaomlow000p77r86fqdudja', 'reservation', 'cmmaomloq000m77r86mnnhkd5', 'created', NULL, '{"status": "REQUESTED", "startTime": "2026-03-03T15:30:00.000Z", "durationMinutes": 15}', 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 14:07:28.592');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbxw1hw0003tar8vt4v0cv6', 'reservation', 'cmmbxw1hd0000tar8lyks0dwe', 'created', NULL, '{"status": "REQUESTED", "startTime": "2026-03-04T13:30:00.000Z", "durationMinutes": 45}', 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-04 11:14:31.7');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbxw5mb0005tar8noe8puf4', 'reservation', 'cmmbxw1hd0000tar8lyks0dwe', 'version_approved', '{"status": "REQUESTED"}', '{"status": "CONFIRMED", "confirmedVersionId": "cmmbxw1hj0001tar8cjocq5bz"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 11:14:37.043');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbxyvs90008tar88kaolwd7', 'reservation', 'cmmbxw1hd0000tar8lyks0dwe', 'status_changed', '{"status": "CONFIRMED"}', '{"status": "UNLOADING_STARTED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 11:16:44.265');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbxyxj7000btar82u588k56', 'reservation', 'cmmbxw1hd0000tar8lyks0dwe', 'status_changed', '{"status": "UNLOADING_STARTED"}', '{"status": "UNLOADING_COMPLETED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 11:16:46.531');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbz5tax000htar8bsks05qe', 'reservation', 'cmmbz5tag000etar8r3xgv4fa', 'created', NULL, '{"status": "REQUESTED", "startTime": "2026-03-04T09:30:00.000Z", "durationMinutes": 15}', 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-04 11:50:07.257');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbzp06n000ltar8mwc0nepf', 'warehouse', 'cmmbzp06j000ktar8nhcwb6yx', 'created', NULL, '{"name": "Ústí nad Labem", "address": "hezká", "timezone": "Europe/Prague"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:05:02.639');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbzp9x2000ntar8heznm6bb', 'gate', 'cmmbzp9wz000mtar8ix2wrvtg', 'created', NULL, '{"name": "Rampa 1 UnL", "warehouseId": "warehouse-01"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:05:15.254');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbzptdi000otar845y6ghoq', 'gate', 'cmmbzp9wz000mtar8ix2wrvtg', 'deleted', NULL, NULL, 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:05:40.47');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmbzpy1d000qtar8cpcz3ksc', 'gate', 'cmmbzpy17000ptar8d0odb2un', 'created', NULL, '{"name": "Rampa 1", "warehouseId": "cmmbzp06j000ktar8nhcwb6yx"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:05:46.513');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc07xtq0000tcr8v14ot0hq', 'user', 'cmm9rz1bx00056wl50fvl9c9z', 'updated', '{"role": "SUPPLIER", "email": "jarda@jicin.cz"}', '{"role": "SUPPLIER", "email": "jarda@jicin.cz"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:19:46.046');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc083b40001tcr8e9a1j4s3', 'user', 'cmm9lmfld000haor8udm1qqah', 'updated', '{"role": "SUPPLIER", "email": "pg@timeslotcontrol.com"}', '{"role": "SUPPLIER", "email": "pg@timeslotcontrol.com"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:19:53.152');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc08abu0002tcr8n88on2sf', 'user', 'cmm9lmf3p0001aor8logp6kqt', 'updated', '{"role": "WAREHOUSE_WORKER", "email": "worker@timeslotcontrol.com"}', '{"role": "WAREHOUSE_WORKER", "email": "worker@timeslotcontrol.com"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:20:02.25');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc08fa80003tcr8n8q0mp7t', 'user', 'cmm9lmf3p0001aor8logp6kqt', 'updated', '{"role": "WAREHOUSE_WORKER", "email": "worker@timeslotcontrol.com"}', '{"role": "WAREHOUSE_WORKER", "email": "worker@timeslotcontrol.com"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:20:08.672');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc08ml00004tcr87zwo78sl', 'user', 'cmm9lmfda000gaor8c8moao65', 'updated', '{"role": "CLIENT", "email": "allegro@timeslotcontrol.com"}', '{"role": "CLIENT", "email": "allegro@timeslotcontrol.com"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:20:18.132');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc08q2f0005tcr8v2g89j5s', 'user', 'cmm9val4b0005mol562c8fkx8', 'updated', '{"role": "CLIENT", "email": "alex@nejkafe.cz"}', '{"role": "CLIENT", "email": "alex@nejkafe.cz"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:20:22.647');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc0k7el0000e8r8s93ii0ad', 'reservation', 'cmmaolmm4000h77r8hb4qykus', 'status_changed', '{"status": "CONFIRMED"}', '{"status": "UNLOADING_STARTED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:29:18.332');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc0k8rx0004e8r87ay6zi2u', 'reservation', 'cmmaolmm4000h77r8hb4qykus', 'status_changed', '{"status": "UNLOADING_STARTED"}', '{"status": "UNLOADING_COMPLETED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:29:20.109');
INSERT INTO public.audit_log (id, "entityType", "entityId", action, "oldData", "newData", "userId", "createdAt") VALUES ('cmmc0kaif0008e8r8vz97uqy2', 'reservation', 'cmmaolmm4000h77r8hb4qykus', 'status_changed', '{"status": "UNLOADING_COMPLETED"}', '{"status": "CLOSED"}', 'cmm9lmev00000aor83glufiiw', '2026-03-04 12:29:22.359');

ALTER TABLE public.audit_log ENABLE TRIGGER ALL;
