"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { parseDecimalInput } from "@/lib/format";
import type { GeocodeResult } from "@/lib/geocode";
import { geocodeAddress } from "@/server/actions/geocode";
import { updatePrivate } from "@/server/actions/properties";
import type { Database } from "@/types/database";

import { FormFeedback } from "./form-feedback";
import { LocationPicker } from "./location-picker";
import { useFormAction } from "./use-form-action";

type PrivateData = Database["public"]["Tables"]["property_private"]["Row"];

const coord = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

export function PropertyPrivateForm({
  propertyId,
  data,
  approx,
}: {
  propertyId: string;
  data: PrivateData | null;
  approx: { lat: number | null; lng: number | null };
}) {
  const { state, pending, formProps } = useFormAction(updatePrivate);
  const e = state.fieldErrors ?? {};
  const [address, setAddress] = useState(data?.full_address ?? "");
  const [latText, setLatText] = useState(coord(data?.exact_lat));
  const [lngText, setLngText] = useState(coord(data?.exact_lng));
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string>();
  const [searching, startSearch] = useTransition();

  const lat = parseDecimalInput(latText);
  const lng = parseDecimalInput(lngText);
  const point =
    lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : null;

  function setPoint(next: { lat: number; lng: number }) {
    setLatText(coord(next.lat));
    setLngText(coord(next.lng));
  }

  function searchAddress() {
    setResults([]);
    setSearchMessage(undefined);
    startSearch(async () => {
      const response = await geocodeAddress(address);
      if (response.status === "error") {
        setSearchMessage(response.message);
        return;
      }
      setResults(response.results);
      setPoint(response.results[0]!);
      setSearchMessage(
        "Ponto marcado pelo primeiro resultado. Confira no mapa e arraste o marcador se precisar.",
      );
    });
  }

  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="id" value={propertyId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <TextField
          label="Endereço completo"
          name="full_address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          hint="Rua, número, bairro e cidade."
          error={e.full_address}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={searchAddress}
          disabled={searching || address.trim().length < 5}
          className="sm:mb-[1.6rem]"
        >
          {searching ? "Buscando…" : "Buscar no mapa"}
        </Button>
      </div>
      {searchMessage ? (
        <p role="status" className="text-small text-abismo">
          {searchMessage}
        </p>
      ) : null}
      {results.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-small font-semibold">Outros resultados</legend>
          {results.map((result) => (
            <button
              key={`${result.lat},${result.lng}`}
              type="button"
              onClick={() => setPoint(result)}
              className="min-h-11 rounded-control border border-junco px-3 text-left text-small hover:border-abismo"
            >
              {result.label}
            </button>
          ))}
        </fieldset>
      ) : null}

      <div className="grid gap-2">
        <p className="text-small text-rocha">
          O endereço não posiciona o imóvel sozinho: o que vale é o ponto no mapa (latitude e
          longitude). Clique no mapa ou arraste o marcador até a casa.
        </p>
        <LocationPicker value={point} onChange={setPoint} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Latitude exata"
          name="exact_lat"
          inputMode="decimal"
          value={latText}
          onChange={(event) => setLatText(event.target.value)}
          hint="Em graus decimais, ex.: -23,8012."
          error={e.exact_lat}
        />
        <TextField
          label="Longitude exata"
          name="exact_lng"
          inputMode="decimal"
          value={lngText}
          onChange={(event) => setLngText(event.target.value)}
          hint="Ex.: -46,0123."
          error={e.exact_lng}
        />
      </div>
      <p className="text-small text-rocha">
        Coordenada pública (aproximada, calculada automaticamente):{" "}
        <strong className="text-abismo">
          {approx.lat !== null && approx.lng !== null
            ? `${coord(approx.lat)}, ${coord(approx.lng)}`
            : "ainda não definida"}
        </strong>
      </p>
      <TextareaField
        label="Anotações internas"
        name="owner_notes"
        rows={4}
        defaultValue={data?.owner_notes ?? ""}
        hint="Visível só no painel. Evite guardar dados pessoais desnecessários do proprietário."
        error={e.owner_notes}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar localização"}
        </Button>
      </div>
    </form>
  );
}
