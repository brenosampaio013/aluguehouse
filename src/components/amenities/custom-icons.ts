import { createLucideIcon, type IconNode } from "lucide-react";

/*
 * Ícones próprios para comodidades que a Lucide não cobre. Mesmo padrão da
 * biblioteca: grade 24×24, traço com currentColor, pontas e junções
 * arredondadas, sem preenchimento. Criados com createLucideIcon, então aceitam
 * as mesmas props (size, strokeWidth, color, className, aria-*).
 */

/** Círculo como caminho SVG. */
function c(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

/** Retângulo com cantos arredondados como caminho SVG. */
function r(x: number, y: number, w: number, h: number, rx = 0) {
  if (!rx) return `M${x} ${y}h${w}v${h}h${-w}z`;
  return (
    `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${rx} 0 0 1 ${rx} ${rx}v${h - 2 * rx}` +
    `a${rx} ${rx} 0 0 1 ${-rx} ${rx}h${-(w - 2 * rx)}a${rx} ${rx} 0 0 1 ${-rx} ${-rx}` +
    `v${-(h - 2 * rx)}a${rx} ${rx} 0 0 1 ${rx} ${-rx}z`
  );
}

function icon(name: string, paths: string[]) {
  const node: IconNode = paths.map((d, i) => ["path", { d, key: `${name}-${i}` }]);
  return createLucideIcon(name, node);
}

export const CeilingFanIcon = icon("ceiling-fan", [
  "M12 3v4.5",
  c(12, 9, 1.5),
  "M10.5 9H3",
  "M13.5 9H21",
  "M10 12.5h4a2 2 0 0 1-4 0z",
  "M8 17l-1 2.5",
  "M12 17v2.5",
  "M16 17l1 2.5",
]);

export const PillowBlanketIcon = icon("pillow-blanket", [
  "M6.5 4h11A2.5 2.5 0 0 1 20 6.5 2.5 2.5 0 0 1 17.5 9h-11A2.5 2.5 0 0 1 4 6.5 2.5 2.5 0 0 1 6.5 4z",
  r(3, 12, 18, 8, 2),
  "M3 15.5h18",
]);

export const KitchenetteIcon = icon("kitchenette", [
  r(3, 11, 18, 9, 1),
  "M3 15h18",
  "M7 11V7.5a1.5 1.5 0 0 1 3 0",
  c(16, 8, 2),
  "M7 17.5h2",
  "M15 17.5h2",
]);

export const GrillIcon = icon("grill", [
  "M5 10a7 7 0 0 1 14 0",
  "M4 10h16",
  "M5.5 10.5c.5 2.5 3 4 6.5 4s6-1.5 6.5-4",
  "M8.5 14l-2 6.5",
  "M15.5 14l2 6.5",
  "M12 14.5v6",
  "M11 3h2",
]);

export const OutdoorKitchenIcon = icon("outdoor-kitchen", [
  "M4 13h12v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z",
  "M2.5 13h15",
  "M8.5 10.5h3",
  c(19, 6, 2),
  "M19 2v.5",
  "M23 6h-.5",
  "M21.8 3.2l-.4.4",
]);

export const CooktopIcon = icon("cooktop", [
  r(3, 3, 18, 18, 2),
  c(8, 8, 2.5),
  c(16, 8, 2.5),
  c(8, 16, 2.5),
  c(16, 16, 2.5),
]);

export const OvenIcon = icon("oven", [
  r(3, 4, 18, 17, 2),
  "M3 9h18",
  "M7 6.5h.01",
  "M10 6.5h.01",
  "M17 6.5h-3",
  r(7, 12, 10, 6, 1),
]);

export const MiniFridgeIcon = icon("mini-fridge", [
  r(6, 7, 12, 14, 2),
  "M6 12h12",
  "M9 9v1",
  "M9 14v2.5",
  "M8 21v1",
  "M16 21v1",
]);

export const CoffeeMakerIcon = icon("coffee-maker", [
  "M6 21V4a1 1 0 0 1 1-1h10v4H9",
  "M9 12h6v3.5a3 3 0 0 1-6 0z",
  "M12 7v2.5",
  "M4 21h15",
]);

export const KettleIcon = icon("kettle", [
  "M5 20h12l-1.4-8.6A2 2 0 0 0 13.6 10H8.4a2 2 0 0 0-2 1.4z",
  "M8 10V8.5a3 3 0 0 1 6 0V10",
  "M16 13.5l3.5-3.5",
  "M3.5 20h15",
]);

export const BlenderIcon = icon("blender", [
  "M7 3h10l-1.5 11h-7z",
  "M7.5 14h9l1 7h-11z",
  "M12 17.5h.01",
  "M10 7h4",
]);

export const RiceCookerIcon = icon("rice-cooker", [
  "M4 10c0-2.8 3.6-5 8-5s8 2.2 8 5",
  "M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z",
  "M10.5 3.5h3",
  "M10 14h4",
]);

export const ToasterIcon = icon("toaster", [
  r(3, 9, 18, 11, 3),
  "M7 9V5.5a1.5 1.5 0 0 1 3 0V9",
  "M14 9V5.5a1.5 1.5 0 0 1 3 0V9",
  "M7 15h.01",
]);

export const DishwasherIcon = icon("dishwasher", [
  r(4, 3, 16, 18, 2),
  "M4 7.5h16",
  "M7 5.2h.01",
  "M10 5.2h.01",
  "M8 17.5v-5",
  "M12 17.5v-6",
  "M16 17.5v-5",
  "M7 17.5h10",
]);

export const BakingTrayIcon = icon("baking-tray", [
  "M3 9h18l-2 8H5z",
  "M6.5 11.5h11",
  "M1.5 9h1.5",
  "M21 9h1.5",
]);

export const DiningTableIcon = icon("dining-table", [
  "M5 10h14",
  "M7 10v10",
  "M17 10v10",
  "M2 5v15",
  "M2 14h3",
  "M22 5v15",
  "M22 14h-3",
]);

export const SaltPepperIcon = icon("salt-pepper", [
  "M6 10h5v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z",
  "M6.5 10l.5-4h3l.5 4",
  "M13 10h5v10a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z",
  "M13.5 10l.5-4h3l.5 4",
  "M8.5 3h.01",
  "M15.5 3h.01",
]);

export const HotTubIcon = icon("hot-tub", [
  "M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z",
  c(8, 8, 1),
  c(12, 5.5, 1.5),
  c(16, 8.5, 1),
  "M6 20l-1 1.5",
  "M18 20l1 1.5",
]);

export const BidetIcon = icon("bidet", [
  "M5 11h14a7 7 0 0 1-14 0z",
  "M9 17.5l-1 3.5h8l-1-3.5",
  "M12 11V6h3",
  "M15 8.5v.01",
]);

export const ShampooIcon = icon("shampoo", [
  "M9 7h6a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a2 2 0 0 1 2-2z",
  "M10.5 7V4h3v3",
  "M13.5 4h3",
  "M10 13h4",
]);

export const ConditionerIcon = icon("conditioner", [
  "M7 3h10",
  "M8 3l1 14h6l1-14",
  r(10, 17, 4, 4, 1),
  "M10.5 8h3",
  "M11 11h2",
]);

export const HairDryerIcon = icon("hair-dryer", [
  "M8 4a5 5 0 0 0 0 10h7l5-2V6l-5-2z",
  c(8, 9, 1.5),
  "M9.5 14l1.5 7h3l-1-7",
]);

export const DryerIcon = icon("dryer", [
  r(4, 3, 16, 18, 2),
  "M4 7h16",
  "M7 5h.01",
  "M10 5h.01",
  c(12, 14, 4),
  "M10.5 15c0-1 1-1 1-2M13 15c0-1 1-1 1-2",
]);

export const IronIcon = icon("iron", [
  "M3 18c0-4 2.5-7 6-7h9a2 2 0 0 1 2 2v5z",
  "M9 11V8a1 1 0 0 1 1-1h7a2 2 0 0 1 2 2v2",
  "M7 15h.01",
  "M10 15h.01",
]);

export const HangerIcon = icon("hanger", [
  "M10 5a2 2 0 1 1 2 2v2",
  "M12 9l-8.6 6.6A1 1 0 0 0 4 17.5h16a1 1 0 0 0 .6-1.9z",
]);

export const ClothesLineIcon = icon("clothes-line", [
  "M4 5v16",
  "M20 5v16",
  "M4 8h16",
  "M7 8v5h4V8",
  "M14 8v7h3V8",
]);

export const WardrobeIcon = icon("wardrobe", [
  r(4, 3, 16, 16, 1),
  "M12 3v16",
  "M10 10v2",
  "M14 10v2",
  "M6 19v2",
  "M18 19v2",
]);

export const SaunaIcon = icon("sauna", [
  "M3 17h18",
  "M5 17v4",
  "M19 17v4",
  "M8 13c-1-1-1-2 0-3s1-2 0-3",
  "M12 13c-1-1-1-2 0-3s1-2 0-3",
  "M16 13c-1-1-1-2 0-3s1-2 0-3",
]);

export const PoolTableIcon = icon("pool-table", [
  r(3, 6, 18, 12, 2),
  "M5.5 8.5h.01",
  "M18.5 8.5h.01",
  "M5.5 15.5h.01",
  "M18.5 15.5h.01",
  c(10, 12, 1.25),
  c(13, 11, 1.25),
  "M15 13.5l7 4",
]);

export const PingPongIcon = icon("ping-pong", [c(10, 10, 6), "M14.5 14.5l5 5", c(19.5, 4.5, 1.5)]);

export const BowlingIcon = icon("bowling", [
  "M8 2.5A1.5 1.5 0 0 0 6.5 4c0 1.3 1 1.8 1 3.2s-1.8 2.8-1.8 6.3c0 2.5.8 4.5 1.3 6.5h3c.5-2 1.3-4 1.3-6.5 0-3.5-1.8-4.9-1.8-6.3S10.5 5.3 10.5 4A1.5 1.5 0 0 0 9 2.5z",
  "M7.2 7.5h2.6",
  c(17, 16, 4),
  "M16 14.5h.01",
  "M18 14.5h.01",
]);

export const ChessPieceIcon = icon("chess-piece", [
  c(12, 6, 2.5),
  "M10 9.5h4l1 7H9z",
  "M7 20.5h10l-1-4H8z",
  "M9 9.5h6",
]);

export const SkateRampIcon = icon("skate-ramp", [
  "M3 20h18V8a12 12 0 0 1-12 12",
  "M3 9h7",
  c(4.5, 10.8, 1),
  c(8.5, 10.8, 1),
]);

export const ClimbingWallIcon = icon("climbing-wall", [
  r(5, 3, 14, 18, 1),
  c(9, 7, 1),
  c(15, 9, 1),
  c(10, 13, 1),
  c(14.5, 17, 1),
]);

export const BaseballIcon = icon("baseball", [
  "M3.5 20.5l2-2",
  "M5.5 18.5l9.6-9.6a2.1 2.1 0 0 1 3 3l-9.6 9.6z",
  c(18, 18, 2.5),
]);

export const HockeyIcon = icon("hockey", ["M8 3l2 14a3 3 0 0 0 3 2.5h5", r(3, 18, 5, 2.5, 1)]);

export const BalconyIcon = icon("balcony", [
  "M8 13V4h8v9",
  "M3 13h18",
  "M3 20h18",
  "M5 13v7",
  "M9 13v7",
  "M12 13v7",
  "M15 13v7",
  "M19 13v7",
]);

export const HammockIcon = icon("hammock", [
  "M3 4v16",
  "M21 4v16",
  "M3 8c3 7 15 7 18 0",
  "M3 8l4 4",
  "M21 8l-4 4",
]);

export const OutdoorDiningIcon = icon("outdoor-dining", [
  "M3 9c1.5-3.5 5-5 9-5s7.5 1.5 9 5z",
  "M12 9v11",
  "M6.5 15h11",
  "M8 15v5",
  "M16 15v5",
]);

export const FireplaceIcon = icon("fireplace", [
  "M2 5h20",
  "M4 5v15",
  "M20 5v15",
  "M8 20v-6a4 4 0 0 1 8 0v6",
  "M12 19c-.9 0-1.5-.7-1.5-1.5 0-1 1.5-2 1.5-3 0 1 1.5 2 1.5 3 0 .8-.6 1.5-1.5 1.5z",
  "M2 20h20",
]);

export const OutdoorShowerIcon = icon("outdoor-shower", [
  "M7 21V5a2 2 0 0 1 2-2h4",
  "M10.5 6.5a3.5 3.5 0 0 1 7 0z",
  "M12 9.5v1",
  "M14 9.5v2",
  "M16 9.5v1",
  "M4 21h6",
  "M18 17h4",
  "M18 20h4",
]);

export const CoDetectorIcon = icon("co-detector", [
  r(4, 4, 16, 12, 3),
  "M10.5 8.6a2 2 0 1 0 0 2.8",
  c(14.5, 10, 1.6),
  "M8 19h8",
  "M10 21.5h4",
]);

export const CribIcon = icon("crib", [
  "M3 4v17",
  "M21 4v17",
  "M3 8h18",
  "M3 17h18",
  "M7.5 8v9",
  "M12 8v9",
  "M16.5 8v9",
]);

export const BabyMonitorIcon = icon("baby-monitor", [
  r(6, 8, 12, 13, 3),
  "M10 13h4",
  "M10 16h4",
  "M9 8L7 3",
  "M16 3.5a3 3 0 0 1 2 2",
  "M17 1.5a5 5 0 0 1 3 3",
]);

export const HighChairIcon = icon("high-chair", [
  "M7 10h10v6H7z",
  "M15 10V3",
  "M4.5 8H12",
  "M8 16l-3 5",
  "M16 16l3 5",
]);

export const PlaypenIcon = icon("playpen", [
  r(4, 6, 16, 12, 1),
  "M4 10l4-4",
  "M4 14l8-8",
  "M4 18l12-12",
  "M8 18l12-12",
  "M12 18l8-8",
  "M16 18l4-4",
]);

export const BabyBathIcon = icon("baby-bath", [
  "M3 11h18a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z",
  c(15, 5.5, 1.5),
  "M12.5 9.5c0-1 .8-1.5 1.5-1.5h3c1 0 2 .8 2 1.5",
  "M8 17l-1 3",
  "M16 17l1 3",
]);

export const KidsCutleryIcon = icon("kids-cutlery", [
  "M8 3a2 2.5 0 0 1 2 2.5C10 7 9.2 8 8 8S6 7 6 5.5A2 2.5 0 0 1 8 3z",
  "M8 8v11a1.5 1.5 0 0 1-3 0",
  "M15 3v4",
  "M17 3v4",
  "M19 3v4",
  "M15 7a2 2 0 0 0 4 0",
  "M17 9v10a1.5 1.5 0 0 0 3 0",
]);

export const TricycleIcon = icon("tricycle", [
  c(17, 16, 4),
  c(5, 18, 2),
  "M5 18l6-5h3",
  "M17 16l-3-9h-2",
  "M11 7h4",
  "M8.5 11h3",
]);

export const CornerGuardIcon = icon("corner-guard", [
  "M4 21V10a6 6 0 0 1 6-6h11",
  "M8 21v-9a4 4 0 0 1 4-4h9",
  "M4 14h4",
  "M14 4v4",
]);

export const OutletCoverIcon = icon("outlet-cover", [
  r(4, 4, 16, 16, 3),
  r(7.5, 7.5, 9, 9, 2),
  "M10.5 10.5v2",
  "M13.5 10.5v2",
]);

export const FireplaceScreenIcon = icon("fireplace-screen", [
  "M5 20v-7a7 7 0 0 1 14 0v7",
  "M5 16h14",
  "M9 7.5V20",
  "M12 6v14",
  "M15 7.5V20",
  "M3 20h18",
]);

export const WindowGuardIcon = icon("window-guard", [
  r(4, 3, 16, 17, 1),
  "M4 11.5h16",
  "M8 11.5V20",
  "M12 11.5V20",
  "M16 11.5V20",
  "M2 20h20",
]);

export const SolarPanelIcon = icon("solar-panel", [
  "M5 4h14l3 10H2z",
  "M3.5 9h17",
  "M9.5 4l-1 10",
  "M14.5 4l1 10",
  "M12 14v6",
  "M8 20h8",
]);

export const ElevatorIcon = icon("elevator", [
  r(4, 3, 16, 18, 2),
  "M9 10l3-3 3 3",
  "M9 14l3 3 3-3",
]);
