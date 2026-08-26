import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Info, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/base/AppBar';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { useCheckout } from '@/store/checkout';
import { haptic } from '@/lib/haptics';

/** Centro padrão: Aparecida de Goiânia, quando não há posição conhecida. */
const CENTRO_PADRAO: [number, number] = [-16.8239, -49.2439];

/**
 * O Leaflet monta o ícone do marcador com URLs relativas ao CSS, que o Vite
 * reescreve no build e quebra. Um ícone em SVG embutido evita depender disso e
 * ainda deixa o marcador na cor da marca.
 */
const iconeMarcador = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:hsl(0 75% 47%);transform:rotate(-45deg);
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

/** Arrastar o mapa move o pino, como nas referências. */
const SeguirCentro = ({ onMove }: { onMove: (lat: number, lng: number) => void }) => {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onMove(c.lat, c.lng);
    },
  });
  return null;
};

const Address = () => {
  const navigate = useNavigate();
  const { customer, setCustomer } = useCheckout();
  const mapRef = useRef<L.Map | null>(null);

  const inicial = useMemo<[number, number]>(
    () =>
      customer.location
        ? [customer.location.lat, customer.location.lng]
        : CENTRO_PADRAO,
    [customer.location],
  );

  const [pos, setPos] = useState<[number, number]>(inicial);
  const [buscandoGps, setBuscandoGps] = useState(false);

  const mover = useCallback((lat: number, lng: number) => setPos([lat, lng]), []);

  const usarGps = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não é suportada neste navegador');
      return;
    }

    // A API existe no navigator mesmo em origem insegura, mas sempre falha por
    // lá. Sem esta checagem, abrir pelo IP da rede local dá "permissão negada"
    // sem explicação. O mapa continua utilizável arrastando o pino.
    if (!window.isSecureContext) {
      toast.error('GPS exige HTTPS', {
        description: 'Arraste o mapa para marcar o local manualmente.',
      });
      return;
    }

    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const destino: [number, number] = [coords.latitude, coords.longitude];
        setPos(destino);
        mapRef.current?.setView(destino, 17);
        haptic('success');
        setBuscandoGps(false);
      },
      (error) => {
        const mensagens: Record<number, string> = {
          [error.PERMISSION_DENIED]: 'Permissão negada. Arraste o mapa para marcar o local.',
          [error.POSITION_UNAVAILABLE]: 'Posição indisponível. Verifique se o GPS está ligado.',
          [error.TIMEOUT]: 'A busca demorou demais. Tente de novo ou arraste o mapa.',
        };
        toast.error('Não foi possível obter sua localização', {
          description: mensagens[error.code] ?? 'Arraste o mapa para marcar o local.',
        });
        setBuscandoGps(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  const confirmar = () => {
    haptic('success');
    setCustomer({ location: { lat: pos[0], lng: pos[1] } });
    toast.success('Local confirmado');
    navigate(-1);
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <AppBar title="Marcar no mapa" fallback="/checkout" />

      <div className="relative flex-1">
        <MapContainer
          center={inicial}
          zoom={16}
          ref={mapRef}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={pos} icon={iconeMarcador} />
          <SeguirCentro onMove={mover} />
        </MapContainer>

        <button
          type="button"
          onClick={usarGps}
          disabled={buscandoGps}
          aria-label="Usar minha localização atual"
          className="press absolute bottom-4 right-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-raised disabled:opacity-70"
        >
          {buscandoGps ? (
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <Crosshair className="h-5 w-5 text-primary" aria-hidden="true" />
          )}
        </button>
      </div>

      <BottomBar
        above={
          <div className="flex items-start gap-2 border-t border-border bg-card px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Não é sua localização?</p>
              <p className="text-xs text-muted-foreground">
                Arraste o mapa até a sua rua para facilitar a entrega.
              </p>
            </div>
          </div>
        }
      >
        <BarButton onClick={confirmar}>
          <MapPin className="h-5 w-5" aria-hidden="true" />
          Confirmar local
        </BarButton>
      </BottomBar>
    </div>
  );
};

export default Address;
