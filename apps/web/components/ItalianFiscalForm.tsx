"use client";

import React, { useState } from "react";
import { ItalianBillingSchema } from "@zerostack/shared";
import { FileText, Building2, User, HelpCircle } from "lucide-react";

interface ItalianFiscalFormProps {
  onChange?: (data: any, isValid: boolean) => void;
}

export const ItalianFiscalForm: React.FC<ItalianFiscalFormProps> = ({ onChange }) => {
  const [isCompany, setIsCompany] = useState(false);
  const [formData, setFormData] = useState({
    isCompany: false,
    ragioneSocialeOIntestatario: "",
    codiceFiscale: "",
    partitaIva: "",
    codiceDestinatarioSDI: "",
    pec: "",
    indirizzo: "",
    cap: "",
    citta: "",
    provincia: "",
    paese: "IT" as const
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    const validation = ItalianBillingSchema.safeParse(updated);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      onChange?.(updated, false);
    } else {
      setErrors({});
      onChange?.(updated, true);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <FileText className="h-4 w-4 text-blue-600" />
        <h4 className="text-sm font-bold text-gray-900">
          Dati Fiscali & Fatturazione Elettronica (Italia)
        </h4>
      </div>

      {/* Switch Persona Fisica / Azienda */}
      <div className="mt-4 flex gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
          <input
            type="radio"
            name="fiscalType"
            checked={!isCompany}
            onChange={() => {
              setIsCompany(false);
              handleFieldChange("isCompany", false);
            }}
            className="text-blue-600 focus:ring-blue-500"
          />
          <User className="h-3.5 w-3.5" /> Privato (Codice Fiscale)
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
          <input
            type="radio"
            name="fiscalType"
            checked={isCompany}
            onChange={() => {
              setIsCompany(true);
              handleFieldChange("isCompany", true);
            }}
            className="text-blue-600 focus:ring-blue-500"
          />
          <Building2 className="h-3.5 w-3.5" /> Azienda / P.IVA (Fattura SDI)
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Intestatario / Ragione Sociale */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            {isCompany ? "Ragione Sociale Azienda" : "Nome e Cognome Intestatario"}
          </label>
          <input
            type="text"
            placeholder={isCompany ? "Es. Acme Solutions S.r.l." : "Es. Mario Rossi"}
            value={formData.ragioneSocialeOIntestatario}
            onChange={(e) => handleFieldChange("ragioneSocialeOIntestatario", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.ragioneSocialeOIntestatario && (
            <p className="mt-1 text-xs text-red-600">{errors.ragioneSocialeOIntestatario}</p>
          )}
        </div>

        {/* Codice Fiscale */}
        <div>
          <label className="block text-xs font-medium text-gray-700">Codice Fiscale</label>
          <input
            type="text"
            placeholder="16 caratteri alfanumerici"
            maxLength={16}
            value={formData.codiceFiscale}
            onChange={(e) => handleFieldChange("codiceFiscale", e.target.value.toUpperCase())}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.codiceFiscale && (
            <p className="mt-1 text-xs text-red-600">{errors.codiceFiscale}</p>
          )}
        </div>

        {/* Partita IVA (se azienda) */}
        {isCompany ? (
          <div>
            <label className="block text-xs font-medium text-gray-700">Partita IVA</label>
            <input
              type="text"
              placeholder="11 cifre numeriche"
              maxLength={11}
              value={formData.partitaIva}
              onChange={(e) => handleFieldChange("partitaIva", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.partitaIva && (
              <p className="mt-1 text-xs text-red-600">{errors.partitaIva}</p>
            )}
          </div>
        ) : null}

        {/* SDI o PEC per Fatturazione Elettronica */}
        {isCompany ? (
          <>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                Codice SDI (7 caratteri)
                <span title="Codice destinatario telematico per il Sistema di Interscambio">
                  <HelpCircle className="h-3 w-3 text-gray-400" />
                </span>
              </label>
              <input
                type="text"
                placeholder="Es. M5UXCR1 (o 0000000)"
                maxLength={7}
                value={formData.codiceDestinatarioSDI}
                onChange={(e) => handleFieldChange("codiceDestinatarioSDI", e.target.value.toUpperCase())}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Indirizzo PEC (in alternativa)</label>
              <input
                type="email"
                placeholder="azienda@pec.it"
                value={formData.pec}
                onChange={(e) => handleFieldChange("pec", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        ) : null}

        {/* Indirizzo e CAP */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700">Indirizzo di Fatturazione</label>
          <input
            type="text"
            placeholder="Via / Piazza e Numero Civico"
            value={formData.indirizzo}
            onChange={(e) => handleFieldChange("indirizzo", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">CAP</label>
          <input
            type="text"
            placeholder="Es. 00100"
            maxLength={5}
            value={formData.cap}
            onChange={(e) => handleFieldChange("cap", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700">Città</label>
            <input
              type="text"
              placeholder="Es. Milano"
              value={formData.citta}
              onChange={(e) => handleFieldChange("citta", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Prov.</label>
            <input
              type="text"
              placeholder="MI"
              maxLength={2}
              value={formData.provincia}
              onChange={(e) => handleFieldChange("provincia", e.target.value.toUpperCase())}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
