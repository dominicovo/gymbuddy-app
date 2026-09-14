// GymBuddy brand renderer — the single source of truth for the app icon.
//
//   swift assets/brand/render-icons.swift
//
// Emits assets/brand/icon.svg (for design tools) plus every platform PNG,
// all from the same geometry below. Drawn with CoreGraphics rather than an
// SVG rasterizer because the only one on a stock Mac (Quick Look) flattens
// transparency onto white, which silently breaks the Android foreground and
// splash layers.
//
// The mark: a padlock whose shackle is a barbell — the gym opens the lock.

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// MARK: - Geometry (1024 canvas, top-left origin, matches the SVG)

let canvas: CGFloat = 1024
let plates = [CGRect(x: 190, y: 176, width: 120, height: 236), CGRect(x: 714, y: 176, width: 120, height: 236)]
let plateRadius: CGFloat = 36
let bar = CGRect(x: 176, y: 260, width: 672, height: 68)
let legs = [CGRect(x: 358, y: 276, width: 68, height: 220), CGRect(x: 598, y: 276, width: 68, height: 220)]
let body = CGRect(x: 236, y: 446, width: 552, height: 402)
let bodyRadius: CGFloat = 96
let keyholeCenter = CGPoint(x: 512, y: 600)
let keyholeRadius: CGFloat = 54
let keyholeSlot = CGRect(x: 490, y: 632, width: 44, height: 112)

// MARK: - Palette

struct RGB { let r: CGFloat; let g: CGFloat; let b: CGFloat }
let gradientTop = RGB(r: 0x6E / 255, g: 0x66 / 255, b: 0xFF / 255)
let gradientBottom = RGB(r: 0x43 / 255, g: 0x38 / 255, b: 0xCA / 255)
let white = RGB(r: 1, g: 1, b: 1)
let accent = RGB(r: 0x8B / 255, g: 0x84 / 255, b: 0xF0 / 255) // matches colors.accent in the app

// MARK: - Variants

struct Variant {
  let file: String
  let size: Int
  let gradientBackground: Bool
  let mark: RGB?      // nil = background only
  let markScale: CGFloat
  let opaque: Bool    // true = no alpha channel in the PNG (App Store requirement)
}

let variants = [
  Variant(file: "assets/icon.png", size: 1024, gradientBackground: true, mark: white, markScale: 1, opaque: true),
  Variant(file: "assets/favicon.png", size: 64, gradientBackground: true, mark: white, markScale: 1, opaque: true),
  Variant(file: "assets/android-icon-background.png", size: 1024, gradientBackground: true, mark: nil, markScale: 1, opaque: true),
  // Adaptive icons only show the centre ~66%, so the mark is scaled into that safe zone.
  Variant(file: "assets/android-icon-foreground.png", size: 1024, gradientBackground: false, mark: white, markScale: 0.62, opaque: false),
  Variant(file: "assets/android-icon-monochrome.png", size: 1024, gradientBackground: false, mark: white, markScale: 0.62, opaque: false),
  // Splash background colour comes from app.json; only the mark lives in the image.
  Variant(file: "assets/splash-icon.png", size: 1024, gradientBackground: false, mark: accent, markScale: 1, opaque: false),
]

// MARK: - Drawing

func roundedPath(_ rect: CGRect, _ radius: CGFloat) -> CGPath {
  CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
}

func drawMark(_ ctx: CGContext, color: RGB, scale: CGFloat) {
  ctx.saveGState()
  ctx.translateBy(x: canvas / 2, y: canvas / 2)
  ctx.scaleBy(x: scale, y: scale)
  ctx.translateBy(x: -canvas / 2, y: -canvas / 2)

  // A transparency layer lets the keyhole be *cleared* to a true hole without
  // punching through whatever background was drawn underneath.
  ctx.beginTransparencyLayer(auxiliaryInfo: nil)
  ctx.setFillColor(red: color.r, green: color.g, blue: color.b, alpha: 1)
  for p in plates { ctx.addPath(roundedPath(p, plateRadius)) }
  ctx.addPath(roundedPath(bar, bar.height / 2))
  for l in legs { ctx.addRect(l) }
  ctx.addPath(roundedPath(body, bodyRadius))
  ctx.fillPath()

  ctx.setBlendMode(.clear)
  ctx.addEllipse(in: CGRect(x: keyholeCenter.x - keyholeRadius, y: keyholeCenter.y - keyholeRadius,
                            width: keyholeRadius * 2, height: keyholeRadius * 2))
  ctx.addPath(roundedPath(keyholeSlot, keyholeSlot.width / 2))
  ctx.fillPath()
  ctx.setBlendMode(.normal)
  ctx.endTransparencyLayer()
  ctx.restoreGState()
}

func render(_ v: Variant) {
  let cs = CGColorSpaceCreateDeviceRGB()
  let alpha: CGImageAlphaInfo = v.opaque ? .noneSkipLast : .premultipliedLast
  guard let ctx = CGContext(data: nil, width: v.size, height: v.size, bitsPerComponent: 8,
                            bytesPerRow: 0, space: cs, bitmapInfo: alpha.rawValue) else {
    fatalError("could not create context for \(v.file)")
  }
  // Flip to a top-left origin so the geometry reads like the SVG.
  ctx.translateBy(x: 0, y: CGFloat(v.size))
  ctx.scaleBy(x: 1, y: -1)
  ctx.scaleBy(x: CGFloat(v.size) / canvas, y: CGFloat(v.size) / canvas)
  ctx.setAllowsAntialiasing(true)
  ctx.setShouldAntialias(true)

  if v.gradientBackground {
    let colors = [
      CGColor(red: gradientTop.r, green: gradientTop.g, blue: gradientTop.b, alpha: 1),
      CGColor(red: gradientBottom.r, green: gradientBottom.g, blue: gradientBottom.b, alpha: 1),
    ] as CFArray
    let gradient = CGGradient(colorsSpace: cs, colors: colors, locations: [0, 1])!
    ctx.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: 0, y: canvas), options: [])
  }
  if let mark = v.mark { drawMark(ctx, color: mark, scale: v.markScale) }

  let image = ctx.makeImage()!
  let url = URL(fileURLWithPath: v.file)
  let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, image, nil)
  CGImageDestinationFinalize(dest)
  print("wrote \(v.file) \(v.size)x\(v.size)\(v.opaque ? "" : " (alpha)")")
}

// MARK: - SVG (same numbers, for designers)

func svg() -> String {
  func r(_ rect: CGRect, _ rx: CGFloat) -> String {
    "    <rect x=\"\(Int(rect.minX))\" y=\"\(Int(rect.minY))\" width=\"\(Int(rect.width))\" height=\"\(Int(rect.height))\" rx=\"\(Int(rx))\"/>"
  }
  let slotTop = keyholeCenter.y + (keyholeRadius * keyholeRadius - (keyholeSlot.width / 2) * (keyholeSlot.width / 2)).squareRoot()
  let sr = keyholeSlot.width / 2
  return """
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <!-- Generated by assets/brand/render-icons.swift — edit the geometry there, not here. -->
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6E66FF"/>
        <stop offset="1" stop-color="#4338CA"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <g fill="#FFFFFF">
  \(plates.map { r($0, plateRadius) }.joined(separator: "\n"))
  \(r(bar, bar.height / 2))
  \(legs.map { r($0, 0) }.joined(separator: "\n"))
      <path fill-rule="evenodd" d="M \(Int(body.minX + bodyRadius)) \(Int(body.minY)) H \(Int(body.maxX - bodyRadius)) A \(Int(bodyRadius)) \(Int(bodyRadius)) 0 0 1 \(Int(body.maxX)) \(Int(body.minY + bodyRadius)) V \(Int(body.maxY - bodyRadius)) A \(Int(bodyRadius)) \(Int(bodyRadius)) 0 0 1 \(Int(body.maxX - bodyRadius)) \(Int(body.maxY)) H \(Int(body.minX + bodyRadius)) A \(Int(bodyRadius)) \(Int(bodyRadius)) 0 0 1 \(Int(body.minX)) \(Int(body.maxY - bodyRadius)) V \(Int(body.minY + bodyRadius)) A \(Int(bodyRadius)) \(Int(bodyRadius)) 0 0 1 \(Int(body.minX + bodyRadius)) \(Int(body.minY)) Z M \(Int(keyholeSlot.minX)) \(String(format: "%.1f", slotTop)) V \(Int(keyholeSlot.maxY - sr)) A \(Int(sr)) \(Int(sr)) 0 0 0 \(Int(keyholeSlot.maxX)) \(Int(keyholeSlot.maxY - sr)) V \(String(format: "%.1f", slotTop)) A \(Int(keyholeRadius)) \(Int(keyholeRadius)) 0 1 0 \(Int(keyholeSlot.minX)) \(String(format: "%.1f", slotTop)) Z"/>
    </g>
  </svg>

  """
}

try! svg().write(toFile: "assets/brand/icon.svg", atomically: true, encoding: .utf8)
print("wrote assets/brand/icon.svg")
variants.forEach(render)
