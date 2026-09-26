// GymBuddy icon renderer — every platform icon, from the official logo.
//
//   swift assets/brand/render-icons.swift
//
// Source: assets/brand/gymbuddy-logo.png — the GYMBUDDY wordmark in brand
// purple #8B84F0 on black, 2000×2000. From it this emits a transparent
// cut-out of the wordmark (for placing on dark UI) plus every icon PNG.
// Drawn with CoreGraphics so transparency survives: the stock Mac SVG
// rasterizer (Quick Look) flattens it onto white, which breaks the Android
// foreground and splash layers.

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent() // assets/
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let purple: (r: Double, g: Double, b: Double) = (0x8B, 0x84, 0xF0)

func load(_ name: String) -> CGImage {
  let url = root.appendingPathComponent(name)
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
    fatalError("Can't read \(url.path)")
  }
  return img
}

func write(_ image: CGImage, _ name: String) {
  let url = root.appendingPathComponent(name)
  guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError(name) }
  CGImageDestinationAddImage(dest, image, nil)
  CGImageDestinationFinalize(dest)
  print("wrote \(name) (\(image.width)×\(image.height))")
}

// MARK: - Cut the wordmark out of the black ground

let logo = load("brand/gymbuddy-logo.png")
let lw = logo.width, lh = logo.height
var px = [UInt8](repeating: 0, count: lw * lh * 4)
let readCtx = CGContext(data: &px, width: lw, height: lh, bitsPerComponent: 8, bytesPerRow: lw * 4, space: space,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
readCtx.draw(logo, in: CGRect(x: 0, y: 0, width: lw, height: lh))

var minX = lw, minY = lh, maxX = 0, maxY = 0
for y in 0..<lh { for x in 0..<lw where px[(y * lw + x) * 4 + 2] > 24 {
  minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
} }
let pad = 6
minX -= pad; minY -= pad; maxX += pad; maxY += pad
let cw = maxX - minX + 1, ch = maxY - minY + 1

// Purple-on-black → purple with alpha. The blue channel carries the most
// signal (0xF0 at full), so it sets coverage, keeping the antialiased edges.
var cut = [UInt8](repeating: 0, count: cw * ch * 4)
for y in 0..<ch { for x in 0..<cw {
  let s = ((y + minY) * lw + (x + minX)) * 4
  let a = min(1.0, Double(px[s + 2]) / purple.b)
  let d = (y * cw + x) * 4
  cut[d] = UInt8(purple.r * a); cut[d + 1] = UInt8(purple.g * a); cut[d + 2] = UInt8(purple.b * a); cut[d + 3] = UInt8(255 * a)
} }
let cutCtx = CGContext(data: &cut, width: cw, height: ch, bitsPerComponent: 8, bytesPerRow: cw * 4, space: space,
                       bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let wordmark = cutCtx.makeImage()!
write(wordmark, "brand/gymbuddy-wordmark.png")
let aspect = CGFloat(cw) / CGFloat(ch)

// MARK: - Icons

enum Ground { case black, clear }

/// The wordmark centred at `widthRatio` of the canvas.
func icon(_ size: Int, ground: Ground, widthRatio: CGFloat, monochrome: Bool = false, _ name: String) {
  let s = CGFloat(size)
  // No alpha channel on opaque icons — the App Store rejects icons that have one.
  let info: CGImageAlphaInfo = ground == .clear ? .premultipliedLast : .noneSkipLast
  let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: info.rawValue)!
  ctx.interpolationQuality = .high
  if ground == .black {
    ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: s, height: s))
  }
  if widthRatio > 0 {
    let w = s * widthRatio, h = w / aspect
    let rect = CGRect(x: (s - w) / 2, y: (s - h) / 2, width: w, height: h)
    if monochrome {
      ctx.clip(to: rect, mask: wordmark)
      ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
      ctx.fill(rect)
    } else {
      ctx.draw(wordmark, in: rect)
    }
  }
  write(ctx.makeImage()!, name)
}

icon(1024, ground: .black, widthRatio: 0.74, "icon.png")                 // iOS / App Store — matches the supplied logo
icon(1024, ground: .clear, widthRatio: 0.92, "splash-icon.png")          // splash, on the app background
icon(64, ground: .black, widthRatio: 0.86, "favicon.png")                 // web (Expo)
// Android adaptive: the launcher crops to the centre ~66%, so the wordmark stays inside it.
icon(1024, ground: .clear, widthRatio: 0.6, "android-icon-foreground.png")
icon(1024, ground: .black, widthRatio: 0, "android-icon-background.png")
icon(1024, ground: .clear, widthRatio: 0.6, monochrome: true, "android-icon-monochrome.png")
