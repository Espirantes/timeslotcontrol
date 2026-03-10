-- Dock Scheduling System — seed data
-- Run after: npx prisma migrate deploy
-- Usage: psql -U postgres -d timeslotcontrol -f prisma/seed-data/seed.sql

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ─── Clients ─────────────────────────────────────────────────────────────────

ALTER TABLE public.client DISABLE TRIGGER ALL;

INSERT INTO public.client (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('client-allegro', 'Allegro', 'warehouse@allegro.cz', '2026-03-02 21:53:26.178', '2026-03-02 21:53:26.178');
INSERT INTO public.client (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('cmm9rxiye00006wl53ybc7hao', 'Online Empire s.r.o.', 'trade@nejkafe.cz', '2026-03-02 22:52:10.934', '2026-03-02 22:52:10.934');

ALTER TABLE public.client ENABLE TRIGGER ALL;

-- ─── Suppliers ───────────────────────────────────────────────────────────────

ALTER TABLE public.supplier DISABLE TRIGGER ALL;

INSERT INTO public.supplier (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('supplier-pg', 'Procter & Gamble', 'logistics@pg.com', '2026-03-02 21:53:26.416', '2026-03-02 22:52:16.561');
INSERT INTO public.supplier (id, name, "contactEmail", "createdAt", "updatedAt") VALUES ('cmm9ryald00036wl5tvj8lau3', 'Jarda z Jicina', 'jarda@jicin.cz', '2026-03-02 22:52:46.616', '2026-03-02 22:52:46.616');

ALTER TABLE public.supplier ENABLE TRIGGER ALL;

-- ─── Warehouses ──────────────────────────────────────────────────────────────

ALTER TABLE public.warehouse DISABLE TRIGGER ALL;

INSERT INTO public.warehouse (id, name, address, timezone, "isActive", "createdAt", "updatedAt") VALUES ('warehouse-01', 'Sklad Praha', 'Prumyslova 1, 150 00 Praha', 'Europe/Prague', true, '2026-03-02 21:53:25.887', '2026-03-02 21:53:25.887');

ALTER TABLE public.warehouse ENABLE TRIGGER ALL;

-- ─── Users ───────────────────────────────────────────────────────────────────
-- All passwords: "password123"

ALTER TABLE public."user" DISABLE TRIGGER ALL;

INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9ptz080000wwl5kkgefd42', 'admin@timeslotcontrol.com', 'Administrator', '$2b$12$BB3yzV75czYon6kipKdjmu3JH6ePmM6ewsghwIcu9S7eD6Y7IAKji', 'ADMIN', NULL, NULL, true, '2026-03-02 21:53:25.839', '2026-03-02 21:53:25.839', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9ptz710001wwl5vsspx815', 'worker@timeslotcontrol.com', 'Pracovnik Skladu', '$2b$12$vOde/eg3kynUMOP5gQ6l9.f4NLziNxJ8LRWWkuSffmBNO9TScuSN2', 'WAREHOUSE_WORKER', NULL, NULL, true, '2026-03-02 21:53:26.124', '2026-03-02 21:53:26.124', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9ptzf2000gwwl5kqmxo4ko', 'allegro@timeslotcontrol.com', 'Allegro Manager', '$2b$12$5kvPehZhy4KG1WKP7bOuzefOIX4D/BqR4s63IpYfv0UR4.8LW1/Iy', 'CLIENT', 'client-allegro', NULL, true, '2026-03-02 21:53:26.413', '2026-03-02 21:53:26.413', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9ptzls000hwwl5o7bsn5dn', 'pg@timeslotcontrol.com', 'P&G Logistics', '$2b$12$QSHsc/jRWP6S8qT9.cFuJ.65E2A04A3yv2QUoT/hcrLIUME0eHtx.', 'SUPPLIER', NULL, 'supplier-pg', true, '2026-03-02 21:53:26.655', '2026-03-02 21:53:26.655', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9rz1bx00056wl50fvl9c9z', 'jarda@jicin.cz', 'Jarda Okurka', '$2b$12$1XnM7UqwNMFaJqCRQQ.2Z.CQuI34HNPW37LcAjoUAKBmYNEySrnRm', 'SUPPLIER', NULL, 'cmm9ryald00036wl5tvj8lau3', true, '2026-03-02 22:53:21.405', '2026-03-02 22:53:21.405', false, true, true);
INSERT INTO public."user" (id, email, name, password, role, "clientId", "supplierId", "isActive", "createdAt", "updatedAt", "notifyBrowser", "notifyInApp", "notifyEmail") VALUES ('cmm9val4b0005mol562c8fkx8', 'alex@nejkafe.cz', 'Alex Baran', '$2b$12$q74GkpLdGrPF4HTwQ3ZFy.QjBIlfHEBjSowegC8sgGNWmkXqL24D2', 'CLIENT', 'cmm9rxiye00006wl53ybc7hao', NULL, true, '2026-03-03 00:26:19.115', '2026-03-03 00:26:19.115', false, true, true);

ALTER TABLE public."user" ENABLE TRIGGER ALL;

-- ─── User-Warehouse assignments ─────────────────────────────────────────────

ALTER TABLE public.user_warehouse DISABLE TRIGGER ALL;

INSERT INTO public.user_warehouse ("userId", "warehouseId") VALUES ('cmm9ptz710001wwl5vsspx815', 'warehouse-01');

ALTER TABLE public.user_warehouse ENABLE TRIGGER ALL;

-- ─── Client-Supplier relationships ───────────────────────────────────────────

ALTER TABLE public.client_supplier DISABLE TRIGGER ALL;

INSERT INTO public.client_supplier ("clientId", "supplierId") VALUES ('client-allegro', 'supplier-pg');
INSERT INTO public.client_supplier ("clientId", "supplierId") VALUES ('cmm9rxiye00006wl53ybc7hao', 'supplier-pg');
INSERT INTO public.client_supplier ("clientId", "supplierId") VALUES ('cmm9rxiye00006wl53ybc7hao', 'cmm9ryald00036wl5tvj8lau3');

ALTER TABLE public.client_supplier ENABLE TRIGGER ALL;

-- ─── Gates ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gate DISABLE TRIGGER ALL;

INSERT INTO public.gate (id, "warehouseId", name, description, "isActive", "createdAt", "updatedAt") VALUES ('gate-01', 'warehouse-01', 'Rampa 1', 'Hlavni vykladkova rampa', true, '2026-03-02 21:53:26.129', '2026-03-02 21:53:26.129');
INSERT INTO public.gate (id, "warehouseId", name, description, "isActive", "createdAt", "updatedAt") VALUES ('gate-02', 'warehouse-01', 'Rampa 2', 'Vedlejsi rampa', true, '2026-03-02 21:53:26.132', '2026-03-02 21:53:26.132');

ALTER TABLE public.gate ENABLE TRIGGER ALL;

-- ─── Gate Opening Hours ──────────────────────────────────────────────────────

ALTER TABLE public.gate_opening_hours DISABLE TRIGGER ALL;

INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7d0002wwl5v79ujtp1', 'gate-01', 0, '06:00', '18:00', false);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7g0003wwl50eo2cljq', 'gate-01', 1, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7i0004wwl5mnjymdpa', 'gate-01', 2, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7l0005wwl5a69phrlu', 'gate-01', 3, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7o0006wwl5nkypfrr8', 'gate-01', 4, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7r0007wwl5ypr2wash', 'gate-01', 5, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7t0008wwl50soizeuv', 'gate-01', 6, '07:00', '13:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7v0009wwl5ltn5ww3c', 'gate-02', 0, '06:00', '18:00', false);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz7x000awwl5clybssml', 'gate-02', 1, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz80000bwwl56o0jcxgw', 'gate-02', 2, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz82000cwwl5yd8zdqde', 'gate-02', 3, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz84000dwwl59d4j1c20', 'gate-02', 4, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz87000ewwl5wpiuesry', 'gate-02', 5, '06:00', '18:00', true);
INSERT INTO public.gate_opening_hours (id, "gateId", "dayOfWeek", "openTime", "closeTime", "isOpen") VALUES ('cmm9ptz8f000fwwl5uqjc1vrt', 'gate-02', 6, '07:00', '13:00', true);

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

ALTER TABLE public.reservation ENABLE TRIGGER ALL;

-- ─── Reservation Versions ────────────────────────────────────────────────────

ALTER TABLE public.reservation_version DISABLE TRIGGER ALL;

INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmm9v5bab0001mol5nevxjxhi', 'cmm9v5ba80000mol54zfewuw2', '2026-03-03 07:00:00', 45, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 00:22:13.087');
INSERT INTO public.reservation_version (id, "reservationId", "startTime", "durationMinutes", "vehicleType", "licensePlate", "sealNumbers", "driverName", "driverContact", notes, "createdById", "createdAt") VALUES ('cmm9vy0qt0008mol5hmpiidcm', 'cmm9vy0qp0007mol534jyjlik', '2026-03-03 07:45:00', 15, 'TRUCK', NULL, NULL, NULL, NULL, NULL, 'cmm9rz1bx00056wl50fvl9c9z', '2026-03-03 00:44:32.448');

ALTER TABLE public.reservation_version ENABLE TRIGGER ALL;

-- ─── Reservation Items ───────────────────────────────────────────────────────

ALTER TABLE public.reservation_item DISABLE TRIGGER ALL;

INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmm9v5bac0002mol5ccuihwyn', 'cmm9v5bab0001mol5nevxjxhi', 8, 'Lego', 200.00, 'tu-eur');
INSERT INTO public.reservation_item (id, "reservationVersionId", quantity, description, "goodsWeightKg", "transportUnitId") VALUES ('cmm9vy0qv0009mol5v33ioswr', 'cmm9vy0qt0008mol5hmpiidcm', 1, NULL, NULL, 'tu-eur');

ALTER TABLE public.reservation_item ENABLE TRIGGER ALL;

ALTER TABLE public.reservation_status_change DISABLE TRIGGER ALL;

-- Reservation 1 (CLOSED): REQUESTED → CONFIRMED → UNLOADING_STARTED → UNLOADING_COMPLETED → CLOSED
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-01', 'cmm9v5ba80000mol54zfewuw2', 'REQUESTED', '2026-03-03 00:22:13.087', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-02', 'cmm9v5ba80000mol54zfewuw2', 'CONFIRMED', '2026-03-03 00:25:00.000', 'cmm9ptz710001wwl5vsspx815');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-03', 'cmm9v5ba80000mol54zfewuw2', 'UNLOADING_STARTED', '2026-03-03 00:35:00.000', 'cmm9ptz710001wwl5vsspx815');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-04', 'cmm9v5ba80000mol54zfewuw2', 'UNLOADING_COMPLETED', '2026-03-03 00:45:00.000', 'cmm9ptz710001wwl5vsspx815');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-05', 'cmm9v5ba80000mol54zfewuw2', 'CLOSED', '2026-03-03 00:53:00.000', 'cmm9ptz710001wwl5vsspx815');

-- Reservation 2 (CONFIRMED): REQUESTED → CONFIRMED
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-06', 'cmm9vy0qp0007mol534jyjlik', 'REQUESTED', '2026-03-03 00:44:32.448', 'cmm9rz1bx00056wl50fvl9c9z');
INSERT INTO public.reservation_status_change (id, "reservationId", status, "changedAt", "changedById") VALUES ('rsc-seed-07', 'cmm9vy0qp0007mol534jyjlik', 'CONFIRMED', '2026-03-03 01:19:22.670', 'cmm9ptz710001wwl5vsspx815');

ALTER TABLE public.reservation_status_change ENABLE TRIGGER ALL;
