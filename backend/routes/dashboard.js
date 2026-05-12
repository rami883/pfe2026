import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'
import DashboardData from '../models/DashboardData.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
const ALLOWED_ROLES = new Set(['admin', 'directeur'])
const RECEPTION_WRITE_ROLES = new Set(['admin', 'gestionnaire'])

function resolveProjectArtifactPath(fileName) {
  const candidates = [
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), '..', fileName),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

function requireDashboardAccess(req, res, next) {
  if (!req.user || !ALLOWED_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }

  return next()
}

function requireReceptionWriteAccess(req, res, next) {
  if (!req.user || !RECEPTION_WRITE_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }

  return next()
}

function parseDaysQuery(daysRaw) {
  const parsed = Number(daysRaw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 7
  }

  return Math.min(Math.floor(parsed), 3650)
}

function normalizeTransportType(valueRaw) {
  const value = String(valueRaw || '').trim().toLowerCase()
  if (value === 'truck') {
    return 'Truck'
  }

  if (value === 'van') {
    return 'Van'
  }

  return ''
}

function normalizeOrigin(valueRaw) {
  const value = String(valueRaw || '').trim().toLowerCase()
  if (value === 'local') {
    return 'Local'
  }

  if (value === 'euro' || value === 'eurol') {
    return 'Euro'
  }

  return ''
}

function normalizeSupplierName(valueRaw) {
  const value = String(valueRaw || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '')
  return value
}

function parsePalletCount(valueRaw) {
  const parsed = Number(valueRaw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function parseArrivalDate(valueRaw) {
  const value = String(valueRaw || '').trim()
  if (!value) {
    return null
  }

  const isIsoDateOnly = /^\\d{4}-\\d{2}-\\d{2}$/.test(value)
  const parsed = isIsoDateOnly ? new Date(`${value}T00:00:00Z`) : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function formatDateValue(valueRaw) {
  const formatUtcDate = (date) => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (valueRaw instanceof Date && !Number.isNaN(valueRaw.getTime())) {
    return formatUtcDate(valueRaw)
  }

  const value = String(valueRaw || '').trim()
  if (!value) {
    return ''
  }

  const isIsoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const parsed = isIsoDateOnly ? new Date(`${value}T00:00:00Z`) : new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return formatUtcDate(parsed)
}

function deriveDayFromDate(dateRaw) {
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function parseDateQuery(dateRaw, { endOfDay = false } = {}) {
  if (!dateRaw) {
    return null
  }

  const parsed = new Date(dateRaw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }

  return parsed
}

function normalizeSupplierQueryList(suppliersRaw) {
  if (!suppliersRaw) {
    return []
  }

  const values = Array.isArray(suppliersRaw)
    ? suppliersRaw
    : String(suppliersRaw).split(',')

  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))]
}

function normalizeSingleQuery(valueRaw) {
  const value = String(valueRaw || '').trim()
  if (!value || value.toLowerCase() === 'all') {
    return ''
  }

  return value.toLowerCase()
}

function parseDashboardFilters(query) {
  const days = parseDaysQuery(query.days)
  const fromDate = parseDateQuery(query.fromDate)
  const toDate = parseDateQuery(query.toDate, { endOfDay: true })
  const suppliers = normalizeSupplierQueryList(query.suppliers)
  const origin = normalizeSingleQuery(query.origin)
  const vehicleType = normalizeSingleQuery(query.vehicleType)

  return {
    days,
    fromDate,
    toDate,
    suppliers,
    origin,
    vehicleType,
  }
}

function buildDateMatch(filters) {
  if (filters.fromDate || filters.toDate) {
    const dateMatch = {}
    if (filters.fromDate) {
      dateMatch.$gte = filters.fromDate
    }
    if (filters.toDate) {
      dateMatch.$lte = filters.toDate
    }
    return dateMatch
  }

  const sinceDate = new Date()
  sinceDate.setHours(0, 0, 0, 0)
  sinceDate.setDate(sinceDate.getDate() - filters.days)
  return { $gte: sinceDate }
}

function getBaseAddFieldsStage() {
  return {
    $addFields: {
      supplierNormalized: {
        $replaceAll: {
          input: {
            $toLower: {
              $trim: {
                input: {
                  $convert: {
                    input: { $ifNull: ['$Supplier', '$Fournisseur'] },
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
              },
            },
          },
          find: '-',
          replacement: '',
        },
      },
      supplierNormalizedLower: {
        $replaceAll: {
          input: {
            $toLower: {
              $trim: {
                input: {
                  $convert: {
                    input: { $ifNull: ['$Supplier', '$Fournisseur'] },
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
              },
            },
          },
          find: '-',
          replacement: '',
        },
      },
      trailerNormalized: {
        $trim: {
          input: {
            $convert: {
              input: {
                $ifNull: ['$Record_No', { $ifNull: ['$Total_N', { $ifNull: ['$Plate_No', '$Plaque_Immatriculation'] }] }],
              },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      trailerNormalizedCanonical: {
        $replaceAll: {
          input: {
            $replaceAll: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: {
                        $toUpper: {
                          $trim: {
                            input: {
                              $convert: {
                                input: {
                                  $ifNull: ['$Record_No', { $ifNull: ['$Total_N', { $ifNull: ['$Plate_No', '$Plaque_Immatriculation'] }] }],
                                },
                                to: 'string',
                                onError: '',
                                onNull: '',
                              },
                            },
                          },
                        },
                      },
                      find: ' ',
                      replacement: '',
                    },
                  },
                  find: '-',
                  replacement: '',
                },
              },
              find: '_',
              replacement: '',
            },
          },
          find: '/',
          replacement: '',
        },
      },
      originNormalized: {
        $let: {
          vars: {
            originRawLower: {
              $toLower: {
                $trim: {
                  input: {
                    $convert: {
                      input: { $ifNull: ['$Origin', '$Origine'] },
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                },
              },
            },
          },
          in: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$$originRawLower', ['euro', 'eurol']] },
                  then: 'Euro',
                },
                {
                  case: { $eq: ['$$originRawLower', 'local'] },
                  then: 'Local',
                },
              ],
              default: '',
            },
          },
        },
      },
      originNormalizedLower: {
        $let: {
          vars: {
            originRawLower: {
              $toLower: {
                $trim: {
                  input: {
                    $convert: {
                      input: { $ifNull: ['$Origin', '$Origine'] },
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                },
              },
            },
          },
          in: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$$originRawLower', ['euro', 'eurol']] },
                  then: 'euro',
                },
                {
                  case: { $eq: ['$$originRawLower', 'local'] },
                  then: 'local',
                },
              ],
              default: '',
            },
          },
        },
      },
      vehicleTypeNormalized: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ['$Vehicle_Type', '$Type_Véhicule'] },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      vehicleTypeNormalizedLower: {
        $toLower: {
          $trim: {
            input: {
              $convert: {
                input: { $ifNull: ['$Vehicle_Type', '$Type_Véhicule'] },
                to: 'string',
                onError: '',
                onNull: '',
              },
            },
          },
        },
      },
      palletsNumeric: {
        $convert: {
          input: { $ifNull: ['$N_Pallets', '$Nb_Palettes'] },
          to: 'double',
          onError: 0,
          onNull: 0,
        },
      },
      waitingDaysNumeric: {
        $convert: {
          input: { $ifNull: ['$Waiting_Days', "$Jours_d'Attente"] },
          to: 'double',
          onError: null,
          onNull: null,
        },
      },
      arrivalDateNormalized: {
        $convert: {
          input: { $ifNull: ['$Arrival_Date', '$Date_Arrivée'] },
          to: 'date',
          onError: null,
          onNull: null,
        },
      },
      arrivalTimeString: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ['$Arrival_Time', '$Heure_Arrivée'] },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      arrivalTimeAsDate: {
        $convert: {
          input: { $ifNull: ['$Arrival_Time', '$Heure_Arrivée'] },
          to: 'date',
          onError: null,
          onNull: null,
        },
      },
    },
  }
}

function getArrivalHourStage() {
  return {
    $addFields: {
      arrivalHour: {
        $ifNull: [
          {
            $cond: [
              { $ne: ['$arrivalTimeAsDate', null] },
              { $hour: '$arrivalTimeAsDate' },
              null,
            ],
          },
          {
            $let: {
              vars: {
                hourMatch: {
                  $regexFind: {
                    input: '$arrivalTimeString',
                    regex: /^\s*(\d{1,2})/,
                  },
                },
              },
              in: {
                $cond: [
                  { $ne: ['$$hourMatch', null] },
                  { $toInt: '$$hourMatch.match' },
                  null,
                ],
              },
            },
          },
        ],
      },
    },
  }
}

function buildBaseMatch(filters, options = {}) {
  const {
    ignoreSupplier = false,
    ignoreOrigin = false,
    ignoreVehicleType = false,
  } = options
  const match = {
    arrivalDateNormalized: buildDateMatch(filters),
  }

  if (!ignoreSupplier && filters.suppliers.length) {
    match.supplierNormalizedLower = { $in: filters.suppliers }
  }

  if (!ignoreOrigin && filters.origin) {
    match.originNormalizedLower = filters.origin
  }

  if (!ignoreVehicleType && filters.vehicleType) {
    match.vehicleTypeNormalizedLower = filters.vehicleType
  }

  return match
}

function weekLabelProjection(idPath) {
  return {
    $concat: [
      { $toString: `${idPath}.year` },
      '-W',
      {
        $cond: [
          { $lt: [`${idPath}.week`, 10] },
          { $concat: ['0', { $toString: `${idPath}.week` }] },
          { $toString: `${idPath}.week` },
        ],
      },
    ],
  }
}

router.get('/suppliers/options', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      {
        $match: buildBaseMatch(filters, {
          ignoreSupplier: true,
        }),
      },
      { $match: { supplierNormalized: { $nin: ['', null] } } },
      { $group: { _id: '$supplierNormalized' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: '$_id' } },
    ])

    return res.status(200).json(rows.map((item) => item.label))
  } catch (error) {
    console.error('Dashboard supplier options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.post('/receptions', protect, requireReceptionWriteAccess, async (req, res) => {
  try {
    const arrivalDate = String(req.body.arrivalDate || '').trim()
    const arrivalDateAsDate = parseArrivalDate(arrivalDate)
    const arrivalTime = String(req.body.arrivalTime || '').trim()
    const trailerPlate = String(req.body.trailerPlate || '').trim()
    const supplier = normalizeSupplierName(req.body.supplier)
    const position = String(req.body.position || '').trim()
    const transportType = normalizeTransportType(req.body.transportType)
    const origin = normalizeOrigin(req.body.origin)
    const palletsCount = parsePalletCount(req.body.palletsCount)

    if (
      !arrivalDate ||
      !arrivalDateAsDate ||
      !arrivalTime ||
      !trailerPlate ||
      !supplier ||
      !position ||
      !transportType ||
      !origin ||
      palletsCount === null
    ) {
      return res
        .status(400)
        .json({ message: 'Veuillez completer correctement tous les champs obligatoires.' })
    }

    const created = await DashboardData.create({
      Record_No: trailerPlate,
      Day: deriveDayFromDate(arrivalDateAsDate),
      Planned_Date: arrivalDateAsDate,
      Arrival_Date: arrivalDateAsDate,
      Arrival_Time: arrivalTime,
      Plate_No: trailerPlate,
      Vehicle_Type: transportType,
      Supplier: supplier,
      Origin: origin,
      N_Pallets: palletsCount,
      Unloaded_Date: null,
      Unloaded_Time: null,
      Waiting_Days: 0,
      Created_By_Email: req.user?.email || '',
      Created_By_Id: String(req.user?._id || ''),
    })
    return res.status(201).json({
      message: 'Reception enregistree avec succes.',
      reception: {
        id: String(created._id),
        createdAt: created.createdAt,
        supplier: created.Supplier,
        origin: created.Origin,
        vehicleType: created.Vehicle_Type,
        pallets: created.N_Pallets,
        recordNo: created.Record_No,
        arrivalDate: formatDateValue(created.Arrival_Date),
        arrivalTime: created.Arrival_Time,
      },
    })
  } catch (error) {
    console.error('Create reception error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/alerts/receptions', protect, requireDashboardAccess, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
      : 30

    const rows = await DashboardData.find({
      Created_By_Id: { $exists: true, $nin: ['', null] },
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .select(
        '_id createdAt Supplier Origin Vehicle_Type N_Pallets Record_No Plate_No Arrival_Date Arrival_Time',
      )
      .lean()

    const alerts = rows.map((row) => ({
      id: String(row._id),
      createdAt: row.createdAt,
      supplier: String(row.Supplier || '').trim(),
      origin: normalizeOrigin(row.Origin) || String(row.Origin || '').trim(),
      vehicleType: normalizeTransportType(row.Vehicle_Type) || String(row.Vehicle_Type || '').trim(),
      pallets: Number(row.N_Pallets) || 0,
      recordNo: String(row.Record_No || row.Plate_No || '').trim(),
      arrivalDate: formatDateValue(row.Arrival_Date),
      arrivalTime: String(row.Arrival_Time || '').trim(),
    }))

    return res.status(200).json(alerts)
  } catch (error) {
    console.error('Reception alerts error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/origins/options', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      {
        $match: buildBaseMatch(filters, {
          ignoreSupplier: true,
          ignoreOrigin: true,
        }),
      },
      { $match: { originNormalized: { $nin: ['', null] } } },
      { $group: { _id: '$originNormalized' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: '$_id' } },
    ])

    return res.status(200).json(rows.map((item) => item.label))
  } catch (error) {
    console.error('Dashboard origin options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/vehicle-types/options', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      {
        $match: buildBaseMatch(filters, {
          ignoreSupplier: true,
          ignoreVehicleType: true,
        }),
      },
      { $match: { vehicleTypeNormalized: { $nin: ['', null] } } },
      { $group: { _id: '$vehicleTypeNormalized' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: '$_id' } },
    ])

    return res.status(200).json(rows.map((item) => item.label))
  } catch (error) {
    console.error('Dashboard vehicle type options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/executive', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const baseMatch = buildBaseMatch(filters)

    const [kpiResult, topSupplierResult, trailersByWeekResult, palletsByWeekResult] =
      await Promise.all([
        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              totalPallets: { $sum: '$palletsNumeric' },
              waitingDaysTotal: { $sum: { $ifNull: ['$waitingDaysNumeric', 0] } },
              waitingDaysCount: {
                $sum: {
                  $cond: [{ $ne: ['$waitingDaysNumeric', null] }, 1, 0],
                },
              },
              onTimeCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$waitingDaysNumeric', null] },
                        { $lte: ['$waitingDaysNumeric', 1] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              delayedCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$waitingDaysNumeric', null] },
                        { $gt: ['$waitingDaysNumeric', 2] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalReceptions: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              totalPallets: { $round: ['$totalPallets', 2] },
              totalReceptions: 1,
              totalTrailers: '$totalReceptions',
              averageWaitingDays: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$waitingDaysCount', 0] },
                      { $divide: ['$waitingDaysTotal', '$waitingDaysCount'] },
                      0,
                    ],
                  },
                  2,
                ],
              },
              onTimeUnloadingRate: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$waitingDaysCount', 0] },
                      { $multiply: [{ $divide: ['$onTimeCount', '$waitingDaysCount'] }, 100] },
                      0,
                    ],
                  },
                  2,
                ],
              },
              delayRate: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$waitingDaysCount', 0] },
                      { $multiply: [{ $divide: ['$delayedCount', '$waitingDaysCount'] }, 100] },
                      0,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $addFields: {
              palletsPerTrailer: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$totalReceptions', 0] },
                      { $divide: ['$totalPallets', '$totalReceptions'] },
                      0,
                    ],
                  },
                  2,
                ],
              },
            },
          },
        ]),

        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          { $match: { supplierNormalized: { $nin: ['', null] } } },
          {
            $group: {
              _id: '$supplierNormalized',
              totalPallets: { $sum: '$palletsNumeric' },
            },
          },
          { $sort: { totalPallets: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              supplier: '$_id',
              totalPallets: { $round: ['$totalPallets', 2] },
            },
          },
        ]),

        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          {
            $group: {
              _id: {
                year: { $isoWeekYear: '$arrivalDateNormalized' },
                week: { $isoWeek: '$arrivalDateNormalized' },
              },
              receptions: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              _id: 0,
              week: weekLabelProjection('$_id'),
              trailers: '$receptions',
            },
          },
        ]),

        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          {
            $group: {
              _id: {
                year: { $isoWeekYear: '$arrivalDateNormalized' },
                week: { $isoWeek: '$arrivalDateNormalized' },
              },
              totalPallets: { $sum: '$palletsNumeric' },
              receptions: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              _id: 0,
              week: weekLabelProjection('$_id'),
              pallets: { $round: ['$totalPallets', 2] },
            },
          },
        ]),
      ])

    const topSupplier = topSupplierResult[0] || { supplier: '-', totalPallets: 0 }
    const kpis = {
      ...(kpiResult[0] || {
        totalPallets: 0,
        totalReceptions: 0,
        totalTrailers: 0,
        palletsPerTrailer: 0,
        averageWaitingDays: 0,
        onTimeUnloadingRate: 0,
        delayRate: 0,
      }),
      topSupplier: topSupplier.supplier,
      topSupplierPallets: topSupplier.totalPallets,
    }

    return res.status(200).json({
      kpis,
      trailersByWeek: trailersByWeekResult,
      palletsByWeek: palletsByWeekResult,
    })
  } catch (error) {
    console.error('Dashboard executive error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/suppliers/performance', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const groupedSuppliers = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      { $match: buildBaseMatch(filters) },
      { $match: { supplierNormalized: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$supplierNormalized',
          totalPallets: { $sum: '$palletsNumeric' },
          totalReceptions: { $sum: 1 },
          records: { $sum: 1 },
          waitingDaysTotal: { $sum: { $ifNull: ['$waitingDaysNumeric', 0] } },
          waitingDaysCount: {
            $sum: {
              $cond: [{ $ne: ['$waitingDaysNumeric', null] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          supplier: '$_id',
          totalPallets: { $round: ['$totalPallets', 2] },
          totalTrailers: '$totalReceptions',
          records: 1,
          averageWaitingDays: {
            $round: [
              {
                $cond: [
                  { $gt: ['$waitingDaysCount', 0] },
                  { $divide: ['$waitingDaysTotal', '$waitingDaysCount'] },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $addFields: {
          avgPalletsPerTrailer: {
            $round: [
              {
                $cond: [
                  { $gt: ['$totalTrailers', 0] },
                  { $divide: ['$totalPallets', '$totalTrailers'] },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { totalPallets: -1, supplier: 1 } },
    ])

    const byPallets = [...groupedSuppliers]
      .sort((a, b) => b.totalPallets - a.totalPallets)
      .slice(0, 10)
      .map((item) => ({
        supplier: item.supplier,
        value: item.totalPallets,
        records: item.records,
      }))

    const byTrailers = [...groupedSuppliers]
      .sort((a, b) => b.totalTrailers - a.totalTrailers)
      .slice(0, 10)
      .map((item) => ({
        supplier: item.supplier,
        value: item.totalTrailers,
        records: item.records,
      }))

    const byEfficiency = [...groupedSuppliers]
      .sort((a, b) => b.avgPalletsPerTrailer - a.avgPalletsPerTrailer)
      .slice(0, 10)
      .map((item) => ({
        supplier: item.supplier,
        value: item.avgPalletsPerTrailer,
        records: item.records,
      }))

    const avgSupplierEfficiency = groupedSuppliers.length
      ? groupedSuppliers.reduce((total, item) => total + item.avgPalletsPerTrailer, 0) /
        groupedSuppliers.length
      : 0

    return res.status(200).json({
      summary: {
        totalSuppliers: groupedSuppliers.length,
        topSupplier: byPallets[0]?.supplier || '-',
        avgSupplierEfficiency: Number(avgSupplierEfficiency.toFixed(2)),
      },
      suppliers: groupedSuppliers,
      topSuppliersByPallets: byPallets,
      topSuppliersByTrailers: byTrailers,
      topSuppliersByAvgPalletsPerTrailer: byEfficiency,
    })
  } catch (error) {
    console.error('Dashboard suppliers performance error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/operations', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const baseMatch = buildBaseMatch(filters)

    const [
      receptionsByDay,
      receptionsByWeek,
      arrivalsByHour,
      vehicleTypeDistribution,
      originDistribution,
      recentShipments,
    ] = await Promise.all([
      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$arrivalDateNormalized',
                },
              },
            },
            count: { $sum: 1 },
            pallets: { $sum: '$palletsNumeric' },
          },
        },
        { $sort: { '_id.day': 1 } },
        {
          $project: {
            _id: 0,
            day: '$_id.day',
            count: 1,
            pallets: { $round: ['$pallets', 2] },
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        {
          $group: {
            _id: {
              year: { $isoWeekYear: '$arrivalDateNormalized' },
              week: { $isoWeek: '$arrivalDateNormalized' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
        {
          $project: {
            _id: 0,
            week: weekLabelProjection('$_id'),
            count: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        getArrivalHourStage(),
        { $match: baseMatch },
        { $match: { arrivalHour: { $ne: null, $gte: 0, $lte: 23 } } },
        {
          $group: {
            _id: '$arrivalHour',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            hour: {
              $concat: [
                {
                  $cond: [
                    { $lt: ['$_id', 10] },
                    { $concat: ['0', { $toString: '$_id' }] },
                    { $toString: '$_id' },
                  ],
                },
                ':00',
              ],
            },
            count: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        { $match: { vehicleTypeNormalized: { $nin: ['', null] } } },
        {
          $group: {
            _id: '$vehicleTypeNormalized',
            value: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
        {
          $project: {
            _id: 0,
            label: '$_id',
            value: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        { $match: { originNormalized: { $nin: ['', null] } } },
        {
          $group: {
            _id: '$originNormalized',
            value: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
        {
          $project: {
            _id: 0,
            label: '$_id',
            value: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        { $sort: { arrivalDateNormalized: -1, _id: -1 } },
        { $limit: 30 },
        {
          $project: {
            _id: 0,
            recordNo: { $ifNull: ['$Record_No', { $ifNull: ['$Total_N', { $ifNull: ['$Plate_No', '$Plaque_Immatriculation'] }] }] },
            supplier: '$supplierNormalized',
            arrivalDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$arrivalDateNormalized',
              },
            },
            arrivalTime: '$arrivalTimeString',
            pallets: { $round: ['$palletsNumeric', 2] },
            vehicleType: '$vehicleTypeNormalized',
            origin: '$originNormalized',
            waitingDays: '$waitingDaysNumeric',
            status: {
              $cond: [{ $ifNull: ['$Unloaded_Date', { $ifNull: ['$Date_Déchargement', false] }] }, 'Unloaded', 'In Progress'],
            },
          },
        },
      ]),
    ])

    return res.status(200).json({
      receptionsByDay,
      receptionsByWeek,
      arrivalsByHour,
      vehicleTypeDistribution,
      originDistribution,
      recentShipments,
    })
  } catch (error) {
    console.error('Dashboard operations error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/supplier', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      { $match: buildBaseMatch(filters) },
      { $match: { supplierNormalized: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$supplierNormalized',
          totalPallets: { $sum: '$palletsNumeric' },
          records: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          supplier: '$_id',
          totalPallets: { $round: ['$totalPallets', 2] },
          records: 1,
        },
      },
      { $sort: { totalPallets: -1, supplier: 1 } },
    ])

    return res.status(200).json(rows)
  } catch (error) {
    console.error('Dashboard supplier error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})


router.get('/analytics/import-costs', protect, requireDashboardAccess, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 2000) : 500

    const resultsPath = resolveProjectArtifactPath('ml_model_results.json')

    if (!fs.existsSync(resultsPath)) {
      return res.status(404).json({
        message: "Resultats ML introuvables. Lancez d'abord le script ml_etl_yazaki.py.",
      })
    }

    const summary = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
    const predictionsPath = summary?.predictions_file
      ? path.resolve(summary.predictions_file)
      : resolveProjectArtifactPath('ml_predictions_montant_euro.xlsx')

    let predictions = []
    if (fs.existsSync(predictionsPath)) {
      const workbook = XLSX.readFile(predictionsPath, { cellDates: true })
      const sheetName = workbook.SheetNames[0]
      if (sheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: null,
          raw: true,
        })

        predictions = rows
          .map((row) => ({
            transporteur: String(row.TRANSPORTEUR || '').trim() || 'UNKNOWN',
            fournisseur: String(row.FOURNISSEUR || '').trim() || 'UNKNOWN',
            typeTransport: String(row.TYPE_TRANSPORT || '').trim() || 'UNKNOWN',
            designation: String(row.DESIGNATION || '').trim() || 'UNKNOWN',
            nbrColis: Number(row.NBR_COLIS) || 0,
            receptionMonth: Number(row.RECEPTION_MONTH) || null,
            receptionWeek: Number(row.RECEPTION_WEEK) || null,
            receptionWeekday: Number(row.RECEPTION_WEEKDAY) || null,
            importDelayDays: Number.isFinite(Number(row.IMPORT_DELAY_DAYS)) ? Number(row.IMPORT_DELAY_DAYS) : null,
            montantReelEuro: Number(row.MONTANT_EN_EURO) || 0,
            montantPreditEuro: Number(row.PREDICTED_MONTANT_EN_EURO) || 0,
            erreurAbsolue: Number(row.ABS_ERROR) || 0,
            erreurPct: Number(row.ERROR_PCT) || 0,
          }))
          .sort((a, b) => b.erreurAbsolue - a.erreurAbsolue)
          .slice(0, limit)
      }
    }

    return res.status(200).json({
      summary,
      predictions,
      files: {
        resultsPath,
        predictionsPath,
      },
    })
  } catch (error) {
    console.error('Dashboard analytics import costs error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})
export default router


