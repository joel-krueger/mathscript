-- Runs once, on first initialization of the pgdata volume.
-- Creates a separate database for integration tests (see T0.8).
CREATE DATABASE mathscript_test OWNER mathscript;
