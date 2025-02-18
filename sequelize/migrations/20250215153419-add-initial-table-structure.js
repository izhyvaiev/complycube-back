'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        CREATE TYPE client_type as ENUM('person', 'company');
        CREATE TABLE clients (
           id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
           external_id TEXT,
           type client_type NOT NULL,
           email TEXT NOT NULL,
           mobile TEXT,
           telephone TEXT,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE,
           deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TYPE person_gender as ENUM('female', 'male', 'other');
        CREATE TABLE persons (
           id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
           client_id BIGINT NOT NULL REFERENCES clients(id),
           first_name TEXT NOT NULL,
           middle_name TEXT,
           last_name TEXT NOT NULL,
           date_of_birth DATE NOT NULL,
           gender person_gender NOT NULL,
           nationality VARCHAR(2) NOT NULL, 
           birth_country VARCHAR(2) NOT NULL,
           social_security_number NUMERIC(9,0),
           social_insurance_number TEXT,
           national_identity_number TEXT,
           tax_identification_number TEXT,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE,
           deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TYPE incorporation_type AS ENUM(
          'charitable_incorporated_organization', 'chartered_company',
          'cooperative', 'governmental_entity', 'holding_company',
          'partnership', 'limited_partnership', 'limited_liability_partnership',
          'other', 'private_limited_company', 'public_limited_company',
          'non_profit_organization', 'non_government_organization',
          'professional_association', 'sole_proprietorship',
          'statutory_company', 'subsidiary_company', 'trust',
          'unlimited_company', 'unlimited_partnership'
        );
        CREATE TABLE companies (
           id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
           client_id BIGINT NOT NULL REFERENCES clients(id),
           name TEXT NOT NULL,
           website TEXT,
           registration_number TEXT,
           incorporation_type incorporation_type NOT NULL,
           incorporation_country VARCHAR(2) NOT NULL,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE,
           deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TYPE document_classification AS ENUM(
          'proof_of_identity',
          'source_of_wealth',
          'source_of_funds',
          'proof_of_address',
          'company_filing',
          'other'
        );
        CREATE TABLE document_types (
          id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
          name TEXT NOT NULL,
          client_type client_type,
          compatible_classifications document_classification[] NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE UNIQUE INDEX document_types_name_idx ON document_types (name) WHERE deleted_at IS NULL;
        CREATE INDEX document_types_client_type ON document_types (client_type, deleted_at);
        
        INSERT INTO document_types (name, client_type, compatible_classifications)
        VALUES ('passport', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('driving_license', 'person'::client_type, ARRAY['proof_of_identity'::document_classification, 'proof_of_address'::document_classification]),
          ('national_insurance_number', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('social_security_number', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('tax_identification_number', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('utility_bill', 'person'::client_type, ARRAY['proof_of_address'::document_classification]),
          ('national_identity_card', 'person'::client_type, ARRAY['proof_of_identity'::document_classification, 'proof_of_address'::document_classification]),
          ('visa', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('polling_card', 'person'::client_type, ARRAY['proof_of_identity'::document_classification, 'proof_of_address'::document_classification]),
          ('residence_permit', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('birth_certificate', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('bank_statement', 'person'::client_type, ARRAY['source_of_wealth'::document_classification, 'source_of_funds'::document_classification]),
          ('change_of_name', 'person'::client_type, ARRAY['proof_of_identity'::document_classification]),
          ('tax_document', 'person'::client_type, ARRAY['source_of_wealth'::document_classification, 'source_of_funds'::document_classification]),
          ('company_confirmation_statement', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('company_annual_accounts', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('company_statement_of_capital', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('company_change_of_address', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('company_incorporation', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('company_change_of_officers', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('company_change_of_beneficial_owners', 'company'::client_type, ARRAY['company_filing'::document_classification]),
          ('unknown', NULL, ARRAY[
              'proof_of_identity'::document_classification,
              'source_of_wealth'::document_classification,
              'source_of_funds'::document_classification,
              'proof_of_address'::document_classification,
              'company_filing'::document_classification,
              'other'::document_classification
          ]),
          ('other', NULL, ARRAY[
              'proof_of_identity'::document_classification,
              'source_of_wealth'::document_classification,
              'source_of_funds'::document_classification,
              'proof_of_address'::document_classification,
              'company_filing'::document_classification,
              'other'::document_classification
          ]);
        CREATE TABLE documents (
          id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
          external_id TEXT,
          document_type_id BIGINT NOT NULL REFERENCES document_types(id),
          classification document_classification NOT NULL,
          issuing_country VARCHAR(2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TABLE verification_sessions (
           id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
           uuid UUID NOT NULL,
           client_id BIGINT NOT NULL REFERENCES clients(id),
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE,
           deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE UNIQUE INDEX verification_sessions_uuid_idx
            ON verification_sessions(uuid) WHERE deleted_at IS NULL;
        CREATE type verification_outcome AS ENUM('clear','attention','not_processed');
        CREATE type verification_type AS ENUM(
          'standard_screening_check', 'extensive_screening_check', 'document_check', 'identity_check',
          'enhanced_identity_check', 'face_authentication_check', 'age_estimation_check', 'proof_of_address_check',
          'multi_bureau_check'
        );
        CREATE TABLE identity_verifications (
           id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
           external_id TEXT,
           verification_session_id BIGINT NOT NULL REFERENCES verification_sessions(id),
           type verification_type NOT NULL,
           is_processed BOOLEAN NOT NULL DEFAULT FALSE,
           outcome verification_outcome,
           client_id BIGINT NOT NULL REFERENCES clients(id),
           document_id BIGINT NOT NULL REFERENCES documents(id),
           live_photo_external_id TEXT,
           breakdown JSONB,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE,
           deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TABLE refresh_tokens (
          id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
          session_id uuid NOT NULL,
          token uuid NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
    `);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
