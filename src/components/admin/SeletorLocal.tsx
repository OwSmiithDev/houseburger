import { useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';

/** Centro padrão quando a loja ainda não tem coordenada: Aparecida de Goiânia. */
const CENTRO_PADRAO: [number, number] = [-16.8239, -49.2439];

const iconeMarcador = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:hsl(0 75% 47%);transform:rotate(-45deg);
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const TocarParaMover = ({ onMove }: { onMove: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMove(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
};

/**
 * Onde fica a loja.
 *
 * O ponto serve para duas coisas: mostrar a quem vai retirar e servir de origem
 * do cálculo por quilômetro. Errar aqui desloca a taxa de todo mundo, então o
 * mapa é arrastável e as coordenadas ficam visíveis para conferência.
 */
export const SeletorLocal = ({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [buscando, setBuscando] = useState(false);
  const inicial: [number, number] = lat !== null && lng !== null ? [lat, lng] : CENTRO_PADRAO;
  const definido = lat !== null && lng !== null;

  const usarGps = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não é suportada neste navegador');
      return;
    }
    if (!window.isSecureContext) {
      toast.error('GPS exige HTTPS', {
        description: 'Arraste o mapa para marcar o local manualmente.',
      });
      return;
    }
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const destino: [number, number] = [
          Number(coords.latitude.toFixed(6)),
          Number(coords.longitude.toFixed(6)),
        ];
        onChange(destino[0], destino[1]);
        mapRef.current?.setView(destino, 17);
        haptic('success');
        setBuscando(false);
      },
      () => {
        toast.error('Não foi possível obter a localização', {
          description: 'Arraste o mapa para marcar o local.',
        });
        setBuscando(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-bold text-foreground">
        Local da loja no mapa
      </span>
      <p className="mb-2 text-xs text-muted-foreground">
        Arraste o pino ou toque no mapa até a porta da loja. Este ponto aparece para quem vai
        retirar e é a origem do cálculo da taxa por quilômetro.
      </p>

      {/* Mesmo motivo do mapa do cliente: contexto proprio para os paineis do
          Leaflet nao escaparem por cima do resto da pagina. */}
      <div className="relative z-0 isolate h-56 overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={inicial}
          zoom={definido ? 17 : 13}
          ref={mapRef}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={inicial}
            icon={iconeMarcador}
            draggable
            autoPan
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
              },
            }}
          />
          <TocarParaMover onMove={onChange} />
        </MapContainer>

        <button
          type="button"
          onClick={usarGps}
          disabled={buscando}
          aria-label="Usar minha localização atual"
          className="press absolute bottom-3 right-3 z-[500] flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-raised disabled:opacity-70"
        >
          {buscando ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <Crosshair className="h-5 w-5 text-primary" aria-hidden="true" />
          )}
        </button>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {definido ? (
          <span className="tabular-nums">
            {lat}, {lng}
          </span>
        ) : (
          <span className="text-destructive">
            Sem coordenada — o cálculo por quilômetro não funciona
          </span>
        )}
      </p>
    </div>
  );
};
