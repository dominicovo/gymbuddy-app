import ExpoModulesCore
import MapKit

// Apple Maps place search, for finding a gym by name ("PureGym Shoreditch"),
// brand, address or postcode — the address geocoder only understands streets.
// No API key, no billing, and queries go to Apple, not a third party.
public class GymSearchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GymSearch")

    // Free text, biased towards `latitude`/`longitude` when given.
    AsyncFunction("search") { (query: String, latitude: Double?, longitude: Double?, promise: Promise) in
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.resultTypes = [.pointOfInterest, .address]
      if let latitude, let longitude {
        request.region = MKCoordinateRegion(
          center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
          latitudinalMeters: 40_000,
          longitudinalMeters: 40_000
        )
      }
      MKLocalSearch(request: request).start { response, error in
        GymSearchModule.finish(response, error, promise)
      }
    }.runOnQueue(.main)

    // No typing needed: fitness centres within `radius` metres of a point.
    AsyncFunction("nearbyGyms") { (latitude: Double, longitude: Double, radius: Double, promise: Promise) in
      let request = MKLocalPointsOfInterestRequest(
        center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
        radius: radius
      )
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: [.fitnessCenter])
      MKLocalSearch(request: request).start { response, error in
        GymSearchModule.finish(response, error, promise)
      }
    }.runOnQueue(.main)
  }

  private static func finish(_ response: MKLocalSearch.Response?, _ error: Error?, _ promise: Promise) {
    // "Nothing found" is an empty list, not a failure.
    if let mkError = error as? MKError, mkError.code == .placemarkNotFound {
      promise.resolve([[String: Any]]())
      return
    }
    if let error {
      promise.reject("E_PLACE_SEARCH", error.localizedDescription)
      return
    }
    promise.resolve((response?.mapItems ?? []).map(serialize))
  }

  private static func serialize(_ item: MKMapItem) -> [String: Any] {
    let place = item.placemark
    let street = [place.subThoroughfare, place.thoroughfare].compactMap { $0 }.joined(separator: " ")
    let address = [street.isEmpty ? nil : street, place.subLocality, place.locality, place.postalCode]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
    var seen = Set<String>()
    return [
      "name": item.name ?? place.name ?? "",
      "address": address.filter { seen.insert($0).inserted }.joined(separator: ", "),
      "latitude": place.coordinate.latitude,
      "longitude": place.coordinate.longitude,
      "isGym": item.pointOfInterestCategory == .fitnessCenter,
    ]
  }
}
