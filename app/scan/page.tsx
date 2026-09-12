import { SiteNav } from "../components/SiteNav";
import { UrdfScanner } from "../components/UrdfScanner";

export default function ScanPage(){return <main className="focusHome"><SiteNav/><section className="scanHome shell"><div className="scanHomeIntro"><span className="eyebrow"><i className="liveDot"/> URDF BENCHMARK READINESS</span><h1>Drop your robot.<br/><em>Know what to test.</em></h1><p>Private structural analysis for your URDF—topology, joints, inertia, collision coverage, and benchmark fit. Your file never leaves this device.</p></div><UrdfScanner/><div className="homeFoot"><span>EMBODIED ARENA / PRIVATE BETA</span></div></section></main>}
