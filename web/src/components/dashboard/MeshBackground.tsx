/** Animated 3D gradient mesh — pure CSS, no images. */
export default function MeshBackground() {
  return (
    <div className="mesh-bg" aria-hidden>
      <div className="mesh-bg__grid" />
      <div className="mesh-orb mesh-orb--1" />
      <div className="mesh-orb mesh-orb--2" />
      <div className="mesh-orb mesh-orb--3" />
      <div className="mesh-orb mesh-orb--4" />
      <div className="mesh-orb mesh-orb--5" />
    </div>
  );
}
