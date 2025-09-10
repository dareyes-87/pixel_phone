import { Link } from "react-router-dom";
import PrismaticBurst from "../components/PrismaticBurst";
import Shuffle from "../components/Shuffle";
import PixelCard from "../components/PixelCard";
import { IoMdGlobe } from "react-icons/io";
import { TbCheckupList } from "react-icons/tb";

export default function HomePage() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Fondo animado */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <PrismaticBurst
          animationType="rotate3d"
          intensity={4}
          speed={0.5}
          distort={1.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={24}
          mixBlendMode="normal"
          colors={['#ff007a', '#4d3dff', '#ffffff']}
        />
      </div>

      {/* Contenido */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          textAlign: 'center',
          padding: '3rem 1rem',
        }}
      >
        <div className="flex flex-col items-center gap-8">
          <Shuffle
            text="Pixel Phone"
            className="pixel-title"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            respectReducedMotion={true}
          />

          {/* Dos “botones” */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Link
              to="/admin"
              className="no-underline inline-block"
              aria-label="Entrar como administrador"
            >
              <PixelCard variant="blue">
                <div className="flex flex-col items-center gap-3">
                  <IoMdGlobe size={48} />
                  <h2 className="text-3xl font-extrabold">Administrador</h2>
                  <p className="text-sm text-white/80 max-w-[220px]">
                    Crea y controla eventos, colores y efectos.
                  </p>
                </div>
              </PixelCard>
            </Link>

            <Link
              to="/join"
              className="no-underline inline-block"
              aria-label="Unirse como Pixel User"
            >
              <PixelCard variant="pink">
                <div className="flex flex-col items-center gap-3">
                  <TbCheckupList size={48} />
                  <h2 className="text-3xl font-extrabold">Pixel User</h2>
                  <p className="text-sm text-white/80 max-w-[220px]">
                    Únete con un código QR y sé un “pixel”.
                  </p>
                </div>
              </PixelCard>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
