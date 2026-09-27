import CoreML
import ExpoModulesCore
import ImageIO
import Vision

// Apple's built-in scene classifier, run on the check-in photo. Everything
// happens on the phone: no network, no model download, the photo never leaves.
public class GymVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GymVision")

    // Labels from Vision's ~1,300-label taxonomy ("barbell", "treadmill",
    // "screenshot", …) at or above `minConfidence`, most confident first.
    AsyncFunction("classify") { (uri: String, minConfidence: Double) throws -> [[String: Any]] in
      let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
      let orientation = GymVisionModule.orientation(of: url)
      let handler = VNImageRequestHandler(url: url, orientation: orientation)
      let request = VNClassifyImageRequest()
      #if targetEnvironment(simulator)
      // The simulator has no Neural Engine; Vision cancels the request unless it runs on the CPU.
      if #available(iOS 17.0, *) {
        if let cpu = MLComputeDevice.allComputeDevices.first(where: { if case .cpu = $0 { return true } else { return false } }) {
          request.setComputeDevice(cpu, for: .main)
        }
      } else {
        request.usesCPUOnly = true
      }
      #endif
      do {
        try handler.perform([request])
      } catch {
        throw Exception(name: "E_CLASSIFY", description: error.localizedDescription)
      }
      return (request.results ?? [])
        .filter { Double($0.confidence) >= minConfidence }
        .sorted { $0.confidence > $1.confidence }
        .map { ["identifier": $0.identifier, "confidence": Double($0.confidence)] }
    }
  }

  // The camera often writes landscape pixels plus an EXIF rotation flag.
  private static func orientation(of url: URL) -> CGImagePropertyOrientation {
    guard
      let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let raw = properties[kCGImagePropertyOrientation] as? UInt32,
      let orientation = CGImagePropertyOrientation(rawValue: raw)
    else { return .up }
    return orientation
  }
}
