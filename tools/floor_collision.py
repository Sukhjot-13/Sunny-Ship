"""Exact rectangular floor faces supplement the coarse terrain grid."""


def rectangular_floor_boxes(name, faces, depth=.12, tolerance=1e-5):
    """Return Three Y-up slabs only where a real upward rectangle exists.

    Reject triangles, sloping surfaces, degenerate faces and concave outlines.
    In particular, never replace a cut deck with its overall bounding box.
    """
    result = []
    for points in faces:
        if len(points) < 3:
            continue
        low = [min(p[k] for p in points) for k in range(3)]
        high = [max(p[k] for p in points) for k in range(3)]
        width, height = high[0]-low[0], high[1]-low[1]
        if high[2]-low[2] > tolerance or min(width, height) < tolerance:
            continue
        area = sum(a[0]*b[1]-b[0]*a[1]
                   for a, b in zip(points, points[1:]+points[:1]))/2
        if area <= 0 or abs(area-width*height) > tolerance*max(1, width*height):
            continue
        # An equal-area self-intersecting or overshooting polygon is not enough:
        # every edge must lie on one of this rectangle's four actual boundaries.
        if any(not any(abs(a[k]-v) <= tolerance and abs(b[k]-v) <= tolerance
                       for k in (0, 1) for v in (low[k], high[k]))
               for a, b in zip(points, points[1:]+points[:1])):
            continue
        result.append(('COLL_FloorExact_'+name+'_'+str(len(result)),
                       (low[0], high[2]-depth, -high[1]),
                       (high[0], high[2], -low[1])))
    return result
