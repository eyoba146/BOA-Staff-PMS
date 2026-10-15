import type { Request, Response, NextFunction } from 'express';
import * as campaignService from './campaign.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, type } = req.query as { status?: string; type?: string };
    const data = await campaignService.listCampaigns({ status, type });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const types = await campaignService.getCampaignTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const managerId = req.user!.id || req.user!.userId;
    const campaign = await campaignService.createCampaign(managerId, req.body);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const managerId = req.user!.id || req.user!.userId;
    const updated = await campaignService.updateCampaign(id, managerId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const managerId = req.user!.id || req.user!.userId;
    const result = await campaignService.deleteCampaign(id, managerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const csvData = await campaignService.generateCampaignExportData();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="boa_campaign_performance.csv"');
    res.send(csvData);
  } catch (err) {
    next(err);
  }
}
