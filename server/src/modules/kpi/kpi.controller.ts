import type { Request, Response, NextFunction } from 'express';
import * as kpiService from './kpi.service.js';
import { todayISO } from '../../utils/date.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status } = req.query as { search?: string; status?: 'all' | 'active' | 'inactive' };
    const kpis = await kpiService.listKpis({ search, status });
    res.json(kpis);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const kpi = await kpiService.getKpiById(id);
    res.json(kpi);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const kpi = await kpiService.createKpi(req.body, userId);
    res.status(201).json(kpi);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const kpi = await kpiService.updateKpi(id, req.body, userId);
    res.json(kpi);
  } catch (err) {
    next(err);
  }
}

export async function setStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;
    const userId = req.user!.id || req.user!.userId;
    const kpi = await kpiService.setKpiStatus(id, Boolean(isActive), userId);
    res.json(kpi);
  } catch (err) {
    next(err);
  }
}

export async function listAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const { kpiId, staffId } = req.query as { kpiId?: string; staffId?: string };
    const assignments = await kpiService.listAssignments({ kpiId, staffId });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
}

export async function setAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { staffIds } = req.body;
    const userId = req.user!.id || req.user!.userId;
    const assignments = await kpiService.setKpiAssignments(id, Array.isArray(staffIds) ? staffIds : [], userId);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
}

export async function getMyAssignedKpis(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const date = (req.query.date as string) || todayISO();
    const assigned = await kpiService.getMyAssignedKpis(userId, date);
    res.json(assigned);
  } catch (err) {
    next(err);
  }
}
