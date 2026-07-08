import type { Photo, Place } from "./types";

export type PlacePhotoNode = {
  place: Place;
  photoCount: number;
  score: number;
};

export type PlacePhotoCluster = {
  id: string;
  label: string;
  places: Place[];
  primaryPlace: Place;
  photoCount: number;
  lat: number;
  lng: number;
  score: number;
};

type ClusterPoint = {
  x: number;
  y: number;
};

export function nodeScore(place: Place, photoCount: number) {
  return photoCount * 100_000 + place.saveCount * 100 + place.recentActivityScore + (place.timCurated ? 10_000 : 0);
}

export function buildPlacePhotoNodes(places: Place[], photos: Photo[]) {
  const photoCounts = photos.reduce<Record<string, number>>((counts, photo) => {
    counts[photo.placeId] = (counts[photo.placeId] ?? 0) + 1;
    return counts;
  }, {});

  return places
    .map((place) => {
      const photoCount = photoCounts[place.id] ?? 0;
      return {
        place,
        photoCount,
        score: nodeScore(place, photoCount),
      };
    })
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
}

export function clusterSizeForZoom(zoom: number) {
  if (zoom >= 13.2) return 0;
  if (zoom >= 12) return 54;
  if (zoom >= 10.8) return 72;
  if (zoom >= 7) return 92;
  return 112;
}

function buildCluster(groupId: string, group: PlacePhotoNode[]): PlacePhotoCluster {
  const sortedGroup = [...group].sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
  const photoCount = sortedGroup.reduce((total, node) => total + node.photoCount, 0);
  const score = sortedGroup.reduce((total, node) => total + node.score, 0);
  const coordinateWeight = sortedGroup.reduce((total, node) => total + Math.max(node.photoCount, 1), 0);
  const lat = sortedGroup.reduce((total, node) => total + node.place.lat * Math.max(node.photoCount, 1), 0) / coordinateWeight;
  const lng = sortedGroup.reduce((total, node) => total + node.place.lng * Math.max(node.photoCount, 1), 0) / coordinateWeight;
  const primaryPlace = sortedGroup[0].place;

  return {
    id: sortedGroup.length === 1 ? primaryPlace.id : `cluster-${groupId}-${sortedGroup.map((node) => node.place.id).join("-")}`,
    label: sortedGroup.length === 1 ? primaryPlace.name : `${primaryPlace.fuzzyLocationLabel} cluster`,
    places: sortedGroup.map((node) => node.place),
    primaryPlace,
    photoCount,
    lat,
    lng,
    score,
  };
}

function byClusterRank(a: PlacePhotoCluster, b: PlacePhotoCluster) {
  return b.score - a.score || a.label.localeCompare(b.label);
}

export function clusterPlacePhotoNodes(nodes: PlacePhotoNode[], clusterSize: number): PlacePhotoCluster[] {
  if (clusterSize <= 0) {
    return nodes.map((node) => ({
      id: node.place.id,
      label: node.place.name,
      places: [node.place],
      primaryPlace: node.place,
      photoCount: node.photoCount,
      lat: node.place.lat,
      lng: node.place.lng,
      score: node.score,
    }));
  }

  const grouped = new Map<string, PlacePhotoNode[]>();

  nodes.forEach((node) => {
    const key = `${Math.round(node.place.lng / clusterSize)}:${Math.round(node.place.lat / clusterSize)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), node]);
  });

  return Array.from(grouped.entries())
    .map(([key, group]) => buildCluster(key, group))
    .sort(byClusterRank);
}

export function clusterProjectedPlacePhotoNodes(
  nodes: PlacePhotoNode[],
  clusterRadius: number,
  project: (place: Place) => ClusterPoint,
): PlacePhotoCluster[] {
  if (clusterRadius <= 0) return clusterPlacePhotoNodes(nodes, 0);

  const remaining = nodes.map((node) => ({ node, point: project(node.place) }));
  const clusters: PlacePhotoCluster[] = [];

  while (remaining.length) {
    const seed = remaining.shift()!;
    const group = [seed.node];

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index];
      const dx = candidate.point.x - seed.point.x;
      const dy = candidate.point.y - seed.point.y;
      if (Math.hypot(dx, dy) <= clusterRadius) {
        group.push(candidate.node);
        remaining.splice(index, 1);
      }
    }

    clusters.push(buildCluster(`${Math.round(seed.point.x)}-${Math.round(seed.point.y)}`, group));
  }

  return clusters.sort(byClusterRank);
}
