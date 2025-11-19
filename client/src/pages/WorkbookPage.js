import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import FriendlyError from '../components/common/FriendlyError';
import EagleGuideChip from '../components/common/EagleGuideChip';
import CommonHero from '../components/common/CommonHero';

const STORAGE_KEY = 'loe.workbook.completedSteps.v2';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  containerMobile: {
    gap: '16px',
    padding: '0 16px 32px'
  },
  hero: {
    padding: '36px',
    borderRadius: '22px',
    background: 'linear-gradient(140deg, rgba(79, 70, 229, 0.12), rgba(14, 165, 233, 0.12))',
    border: '1px solid rgba(99, 102, 241, 0.18)',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center'
  },
  heroMobile: {
    padding: '24px',
    borderRadius: '18px'
  },
  heroTitle: {
    fontSize: '30px',
    fontWeight: 800,
    margin: 0,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em'
  },
  heroTitleMobile: {
    fontSize: '24px'
  },
  heroDesc: {
    fontSize: '16px',
    lineHeight: 1.6,
    color: 'var(--tone-strong)'
  },
  heroDescMobile: {
    fontSize: '14px',
    lineHeight: 1.5
  },
  stepGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '18px'
  },
  stepGridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  cardButton: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative'
  },
  cardButtonMobile: {
    padding: '16px'
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  cardHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: 'var(--tone-muted)'
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--tone-muted)'
  },
  deleteButton: {
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid rgba(248,113,113,0.4)',
    background: 'rgba(248,113,113,0.12)',
    color: 'rgb(220,38,38)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  deleteButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(124,58,237,0.12)',
    color: 'var(--indigo-strong)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  generatorCard: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px dashed var(--border-strong)',
    background: 'var(--surface-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  wizardContainer: {
    marginTop: '12px',
    padding: '24px',
    borderRadius: '24px',
    border: '1px solid rgba(148,163,184,0.28)',
    background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    boxShadow: '0 28px 56px rgba(15,23,42,0.28)',
    backgroundSize: '200% 200%',
    animation: 'slowGradient 36s ease-in-out infinite',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  wizardContainerMobile: {
    padding: '18px',
    borderRadius: '18px'
  },
  wizardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  wizardProgress: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--indigo-strong)',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  },
  wizardStageTitle: {
    margin: '6px 0 0',
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)'
  },
  wizardStageTitleMobile: {
    fontSize: '20px'
  },
  wizardCloseButton: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  wizardCloseButtonMobile: {
    width: '100%'
  },
  wizardStageDescription: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.6,
    color: 'var(--tone-strong)'
  },
  wizardStageDescriptionMobile: {
    fontSize: '14px'
  },
  wizardStageBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  wizardStageBodyMobile: {
    gap: '14px'
  },
  wizardFooter: {
    position: 'sticky',
    bottom: 0,
    padding: '16px',
    borderRadius: '16px',
    background: 'var(--surface-card)',
    border: '1px solid rgba(148,163,184,0.24)',
    boxShadow: '0 -18px 32px rgba(15,23,42,0.16)',
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  wizardFooterMobile: {
    flexDirection: 'column',
    alignItems: 'stretch'
  },
  wizardPrimaryButton: {
    padding: '14px 20px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    flex: 1,
    width: '100%'
  },
  wizardSecondaryButton: {
    padding: '12px 18px',
    borderRadius: '14px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  wizardStageBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(16,185,129,0.16)',
    color: 'var(--success-strong)',
    fontSize: '12px',
    fontWeight: 700
  },
  wizardInfoCard: {
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  generatorSearchRow: {
    display: 'flex'
  },
  generatorSearchInput: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontSize: '14px'
  },
  generatorDocGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '340px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  generatorDocGridMobile: {
    maxHeight: '260px'
  },
  generatorDocCard: {
    textAlign: 'left',
    padding: '18px',
    borderRadius: '22px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    background: 'linear-gradient(150deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease',
    boxShadow: '0 20px 38px rgba(15, 23, 42, 0.32)',
    color: '#e2e8f0',
    backgroundSize: '200% 200%',
    animation: 'slowGradient 24s ease-in-out infinite'
  },
  generatorDocCardActive: {
    border: '1px solid rgba(99, 102, 241, 0.65)',
    background: 'linear-gradient(135deg, rgba(129,140,248,0.32), rgba(14,165,233,0.25))',
    boxShadow: '0 26px 44px rgba(79, 70, 229, 0.35)'
  },
  generatorDocTitle: {
    fontWeight: 700,
    fontSize: '15px',
    color: '#f8fafc',
    margin: 0
  },
  generatorDocMeta: {
    fontSize: '12px',
    color: 'rgba(226,232,240,0.85)',
    margin: 0
  },
  generatorEmpty: {
    padding: '16px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    textAlign: 'center',
    fontSize: '13px'
  },
  generatorErrorBox: {
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(248,113,113,0.15)',
    color: 'var(--danger-strong)',
    fontSize: '13px'
  },
  generatorPassageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '320px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  generatorPassageListMobile: {
    maxHeight: '260px'
  },
  generatorPassageCard: {
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left',
    padding: '18px',
    borderRadius: '22px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.28)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    color: '#e2e8f0',
    backgroundSize: '200% 200%',
    animation: 'slowGradient 24s ease-in-out infinite'
  },
  generatorPassageCardActive: {
    border: '1px solid rgba(16, 185, 129, 0.55)',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(59, 130, 246, 0.12))',
    boxShadow: '0 20px 36px rgba(16, 185, 129, 0.22)'
  },
  generatorPassageExcerpt: {
    fontSize: '13px',
    color: 'rgba(240,245,255,0.9)',
    lineHeight: 1.6
  },
  overviewLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 320px) 1fr',
    gap: '20px',
    alignItems: 'flex-start'
  },
  overviewLayoutMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  docColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)'
  },
  docColumnMobile: {
    padding: '16px',
    borderRadius: '14px'
  },
  docSearchInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontSize: '14px'
  },
  docList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '480px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  docListMobile: {
    flexDirection: 'row',
    gap: '8px',
    maxHeight: 'unset',
    overflowX: 'auto',
    padding: '0 0 4px'
  },
  docListButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    cursor: 'pointer',
    transition: 'border 0.2s ease, background 0.2s ease',
    textAlign: 'left'
  },
  docListButtonMobile: {
    minWidth: '160px'
  },
  docListButtonActive: {
    border: '1px solid var(--indigo)',
    background: 'rgba(99,102,241,0.12)'
  },
  docListTitle: {
    fontWeight: 700,
    fontSize: '14px',
    margin: 0,
    color: 'var(--text-primary)'
  },
  docListMeta: {
    fontSize: '12px',
    color: 'var(--tone-muted)'
  },
  docDetail: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  docDetailMobile: {
    padding: '16px',
    borderRadius: '14px'
  },
  docHeaderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  docHeaderTop: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  docHeaderTopMobile: {
    gap: '10px'
  },
  docMetaInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '12px',
    color: 'var(--tone-strong)'
  },
  docMetaInfoMobile: {
    gap: '8px'
  },
  workbookList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px'
  },
  workbookListItem: {
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  workbookListItemMobile: {
    padding: '14px',
    gap: '10px'
  },
  workbookListItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },
  workbookListItemHeaderMobile: {
    alignItems: 'flex-start'
  },
  workbookIndexBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(99,102,241,0.12)',
    color: 'var(--indigo-strong)',
    fontWeight: 700,
    fontSize: '12px'
  },
  workbookListTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0
  },
  workbookStats: {
    fontSize: '12px',
    color: 'var(--tone-muted)'
  },
  workbookListActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  workbookListActionsMobile: {
    width: '100%',
    flexDirection: 'column'
  },
  docEmpty: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px dashed var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    textAlign: 'center'
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  select: {
    flex: '1 1 220px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)'
  },
  primaryButton: {
    padding: '14px 26px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(79,70,229,1) 0%, rgba(14,165,233,1) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 800,
    fontSize: '16px',
    cursor: 'pointer',
    minWidth: '180px',
    boxShadow: '0 20px 40px rgba(79, 70, 229, 0.30)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  primaryButtonMobile: {
    width: '100%',
    minWidth: 'unset'
  },
  secondaryButton: {
    padding: '12px 22px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--tone-hero)',
    fontWeight: 800,
    cursor: 'pointer',
    minWidth: '150px',
    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.12)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  secondaryButtonMobile: {
    width: '100%',
    minWidth: 'unset'
  },
  detailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  detailContainerMobile: {
    gap: '18px'
  },
  detailHeader: {
    padding: '24px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(56,189,248,0.12))',
    border: '1px solid var(--surface-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailHeaderMobile: {
    padding: '18px',
    borderRadius: '16px'
  },
  stepSelector: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  stepSelectorMobile: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '4px'
  },
  stepButton: {
    padding: '12px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(248, 250, 252, 0.92)',
    cursor: 'pointer',
    fontWeight: 700,
    color: 'var(--tone-strong)',
    fontSize: '0.95rem',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)'
  },
  stepButtonMobile: {
    flex: '0 0 auto',
    padding: '10px 16px'
  },
  stepButtonActive: {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(14, 165, 233, 0.85) 100%)',
    color: 'var(--text-on-accent)',
    borderColor: 'transparent',
    boxShadow: '0 18px 36px rgba(79, 70, 229, 0.26)'
  },
  mobileStepHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  mobileStepIndicator: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)'
  },
  mobileStepNav: {
    display: 'flex',
    gap: '8px'
  },
  mobileNavButton: {
    padding: '10px 18px',
    borderRadius: '999px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(255, 255, 255, 0.96)',
    fontWeight: 800,
    color: '#0f172a',
    cursor: 'pointer',
    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.16)'
  },
  mobileNavButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  missionBox: {
    padding: '18px',
    borderRadius: '16px',
    background: 'var(--surface-card)',
    border: '1px dashed var(--border-strong)',
    fontSize: '15px',
    color: 'var(--text-primary)',
    lineHeight: 1.6
  },
  missionBoxMobile: {
    padding: '14px',
    fontSize: '14px'
  },
  flashcard: {
    width: '100%',
    maxWidth: '540px',
    minHeight: '220px',
    borderRadius: '20px',
    padding: '32px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    boxShadow: '0 24px 50px -35px rgba(15,23,42,0.35)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px'
  },
  flashcardMobile: {
    maxWidth: '100%',
    padding: '20px',
    borderRadius: '16px',
    minHeight: '180px'
  },
  flashcardCenter: {
    textAlign: 'center',
    alignItems: 'center'
  },
  flashcardLeft: {
    textAlign: 'left',
    alignItems: 'stretch'
  },
  flashcardFront: {
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '20px',
    lineHeight: 1.5,
    whiteSpace: 'pre-line'
  },
  flashcardFrontMobile: {
    fontSize: '18px'
  },
  flashcardFrontInteractive: {
    width: '100%',
    textAlign: 'left'
  },
  flashcardFrontInteractiveMobile: {
    fontSize: '16px'
  },
  flashcardBack: {
    color: 'var(--tone-strong)',
    fontSize: '18px',
    lineHeight: 1.7,
    whiteSpace: 'pre-line'
  },
  flashcardBackMobile: {
    fontSize: '16px'
  },
  puzzleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left'
  },
  puzzleTokenTray: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  puzzleTokenButton: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'background 0.2s ease, transform 0.2s ease'
  },
  puzzleTokenButtonMobile: {
    padding: '8px 12px',
    fontSize: '13px'
  },
  puzzleTokenDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  puzzleSelectedRow: {
    minHeight: '48px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px',
    borderRadius: '12px',
    border: '1px dashed var(--surface-border)',
    background: 'rgba(99,102,241,0.15)'
  },
  puzzleSelectedToken: {
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600
  },
  puzzleStatus: {
    fontSize: '13px',
    color: 'var(--tone-strong)'
  },
  puzzleControls: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  sequenceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sequenceHelperRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  sequenceHelperText: {
    fontSize: '14px',
    color: 'var(--tone-hero)',
    fontWeight: 600
  },
  sequenceResetButton: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.5)',
    background: 'var(--surface-soft)',
    color: 'var(--tone-hero)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(15, 23, 42, 0.12)'
  },
  sequenceResetButtonDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  sequenceCardGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sequenceCard: {
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    boxShadow: '0 10px 22px rgba(15,23,42,0.12)',
    padding: '14px 16px',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
  },
  sequenceCardSelected: {
    borderColor: 'rgba(59,130,246,0.45)',
    boxShadow: '0 16px 28px rgba(59,130,246,0.22)',
    transform: 'translateY(-2px)',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(125,211,252,0.16))'
  },
  sequenceCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  sequenceTag: {
    minWidth: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '18px'
  },
  sequenceBadge: {
    minWidth: '40px',
    height: '36px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
    color: 'var(--text-on-accent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '16px',
    boxShadow: '0 12px 24px rgba(99,102,241,0.35)'
  },
  sequencePlaceholder: {
    minWidth: '40px',
    height: '36px',
    borderRadius: '999px',
    border: '1px dashed rgba(59,130,246,0.35)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--tone-muted)',
    fontWeight: 700,
    fontSize: '16px',
    background: 'rgba(59,130,246,0.05)'
  },
  sequenceBody: {
    fontSize: '15px',
    lineHeight: 1.7
  },
  sequenceAnswer: {
    fontSize: '14px',
    color: 'var(--success-strong)',
    fontWeight: 600
  },
  insertContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left'
  },
  insertGivenBox: {
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  insertGivenLabel: {
    fontWeight: 700,
    color: 'var(--tone-hero)',
    fontSize: '14px'
  },
  insertGivenSentence: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: 'var(--text-primary)'
  },
  insertContextBox: {
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  insertContextLine: {
    fontSize: '14px',
    color: 'var(--tone-strong)'
  },
  insertOptionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  insertOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'border 0.2s ease, box-shadow 0.2s ease'
  },
  insertOptionSelected: {
    border: '1px solid rgba(59,130,246,0.45)',
    boxShadow: '0 12px 26px rgba(59,130,246,0.2)',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(125,211,252,0.16))'
  },
  insertOptionLabel: {
    minWidth: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--surface-soft)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '15px'
  },
  insertOptionText: {
    flex: 1,
    textAlign: 'left',
    fontSize: '14px',
    lineHeight: 1.6
  },
  insertAnswer: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--success-strong)'
  },
  puzzleInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontSize: '15px'
  },
  puzzleInputMobile: {
    fontSize: '14px'
  },
  cardControls: {
    display: 'flex',
    gap: '18px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  checklist: {
    padding: '18px',
    borderRadius: '16px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    color: 'var(--tone-strong)',
    fontSize: '14px',
    lineHeight: 1.6
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,0.12)',
    color: 'var(--success-strong)',
    fontSize: '12px',
    fontWeight: 600
  },
  emptyState: {
    padding: '40px',
    borderRadius: '18px',
    border: '1px dashed var(--border-strong)',
    background: 'var(--surface-soft)',
    textAlign: 'center',
    color: 'var(--tone-strong)',
    lineHeight: 1.6
  },
  testContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  testHeaderRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  testQuestionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  testQuestionCard: {
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  testQuestionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  testQuestionPrompt: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: 'var(--tone-strong)'
  },
  testHint: {
    fontSize: '13px',
    color: 'var(--tone-muted)'
  },
  testOptionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  testOptionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    cursor: 'pointer',
    transition: 'border 0.2s ease, background 0.2s ease'
  },
  testOptionItemSelected: {
    border: '1px solid var(--indigo)',
    background: 'rgba(99,102,241,0.12)'
  },
  testInputsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  testInput: {
    flex: '1 1 180px',
    minWidth: '160px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    fontSize: '14px',
    color: 'var(--text-primary)'
  },
  testSubmitRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  testResultCard: {
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  resultBadgeCorrect: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,0.15)',
    color: 'var(--success-strong)',
    fontSize: '12px',
    fontWeight: 700
  },
  resultBadgeIncorrect: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(248,113,113,0.15)',
    color: 'rgb(220,38,38)',
    fontSize: '12px',
    fontWeight: 700
  }
};

const loadCompletedFromStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveCompletedToStorage = (value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('[workbook] completion storage 실패:', error?.message || error);
  }
};

const isTeacherOrAdmin = (role) => ['teacher', 'admin'].includes(String(role || '').toLowerCase());
const isProOrHigher = (role, membership) => {
  const r = String(role || '').toLowerCase();
  const m = String(membership || '').toLowerCase();
  if (r === 'admin' || r === 'teacher') return true;
  return ['pro', 'vip'].includes(m);
};

const WordOrderPuzzle = ({ card, reveal, compact = false }) => {
  const [available, setAvailable] = useState([]);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    const tokens = Array.isArray(card?.tokens)
      ? card.tokens.map((token, idx) => ({
          key: token.id || `${idx}-${token.text}`,
          text: token.text
        }))
      : [];
    setAvailable(tokens);
    setPicked([]);
  }, [card]);

  const handlePick = useCallback((token) => {
    setAvailable((prev) => prev.filter((item) => item.key !== token.key));
    setPicked((prev) => [...prev, token]);
  }, []);

  const handleRemove = useCallback((index) => {
    setPicked((prevPicked) => {
      const token = prevPicked[index];
      if (!token) return prevPicked;
      setAvailable((prev) => [...prev, token]);
      return prevPicked.filter((_, i) => i !== index);
    });
  }, []);

  const handleReset = useCallback(() => {
    const tokens = Array.isArray(card?.tokens)
      ? card.tokens.map((token, idx) => ({
          key: token.id || `${idx}-${token.text}`,
          text: token.text
        }))
      : [];
    setAvailable(tokens);
    setPicked([]);
  }, [card]);

  const assembled = picked.map((token) => token.text).join(' ');
  const answer = (card?.answer || '').trim();
  const isCorrect = assembled.trim() === answer && answer.length > 0;
  const tokenButtonStyle = compact
    ? { ...styles.puzzleTokenButton, ...styles.puzzleTokenButtonMobile }
    : styles.puzzleTokenButton;
  const resetButtonStyle = compact
    ? { ...styles.secondaryButton, ...styles.secondaryButtonMobile }
    : styles.secondaryButton;

  return (
    <div style={styles.puzzleContainer}>
      <div style={styles.puzzleSelectedRow}>
        {picked.length === 0 && <span style={styles.puzzleStatus}>여기에 단어를 눌러 순서대로 담아 보세요.</span>}
        {picked.map((token, index) => (
          <button
            type="button"
            key={`picked-${token.key}`}
            style={styles.puzzleSelectedToken}
            onClick={() => handleRemove(index)}
          >
            {token.text}
          </button>
        ))}
      </div>
      <div style={styles.puzzleTokenTray}>
        {available.map((token) => (
          <button
            type="button"
            key={`available-${token.key}`}
            style={tokenButtonStyle}
            onClick={() => handlePick(token)}
          >
            {token.text}
          </button>
        ))}
        {available.length === 0 && picked.length > 0 && (
          <span style={styles.puzzleStatus}>모든 단어를 사용했어요!</span>
        )}
      </div>
      <div style={styles.puzzleControls}>
        <button type="button" style={resetButtonStyle} onClick={handleReset}>
          퍼즐 초기화
        </button>
        <span style={{ ...styles.puzzleStatus, color: isCorrect ? 'var(--success-strong)' : 'var(--tone-muted)' }}>
          현재 조합: {assembled || '—'}
        </span>
      </div>
      {reveal && (
        <div style={styles.puzzleStatus}>정답: {answer}</div>
      )}
    </div>
  );
};

const ParagraphOrderInteractive = ({ card, reveal }) => {
  const segments = Array.isArray(card?.segments) ? card.segments : [];
  const [sequence, setSequence] = useState([]);

  useEffect(() => {
    setSequence([]);
  }, [card]);

  if (!segments.length) {
    return card?.front || '문단 배열 자료가 준비되지 않았어요.';
  }

  const handleToggle = (label) => {
    setSequence((prev) => {
      const exists = prev.includes(label);
      if (exists) {
        return prev.filter((item) => item !== label);
      }
      return [...prev, label];
    });
  };

  const handleReset = () => setSequence([]);
  const answer = Array.isArray(card?.correctSequence) ? card.correctSequence.join(' → ') : '';

  return (
    <div style={styles.sequenceContainer}>
      <div style={styles.sequenceHelperRow}>
        <span style={styles.sequenceHelperText}>순서를 차례대로 눌러 보세요. 다시 누르면 취소돼요.</span>
        <button
          type="button"
          style={{
            ...styles.sequenceResetButton,
            ...(sequence.length ? {} : styles.sequenceResetButtonDisabled),
          }}
          onClick={handleReset}
          disabled={!sequence.length}
        >
          초기화
        </button>
      </div>
      <div style={styles.sequenceCardGrid}>
        {segments.map((segment) => {
          const orderIndex = sequence.indexOf(segment.label);
          const isSelected = orderIndex >= 0;
          const displayNumber = isSelected ? orderIndex + 1 : null;
          return (
            <button
              key={`segment-${segment.label}`}
              type="button"
              style={{
                ...styles.sequenceCard,
                ...(isSelected ? styles.sequenceCardSelected : {}),
              }}
              onClick={() => handleToggle(segment.label)}
            >
              <div style={styles.sequenceCardHeader}>
                <span style={styles.sequenceTag}>{segment.label}</span>
                {displayNumber ? (
                  <span style={styles.sequenceBadge}>{displayNumber}</span>
                ) : (
                  <span style={styles.sequencePlaceholder}>＋</span>
                )}
              </div>
              <div style={styles.sequenceBody}>{segment.text}</div>
            </button>
          );
        })}
      </div>
      {reveal && (
        <div style={styles.sequenceAnswer}>정답: {answer || '추후 제공 예정'}</div>
      )}
    </div>
  );
};

const SentenceInsertInteractive = ({ card, reveal }) => {
  const options = Array.isArray(card?.options) ? card.options : [];
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setSelected(null);
  }, [card]);

  if (!options.length) {
    return card?.front || '선택지가 준비되지 않았어요.';
  }

  const handleSelect = (label) => {
    setSelected((prev) => (prev === label ? null : label));
  };

  const answer = card?.correctOption || '';

  return (
    <div style={styles.insertContainer}>
      <div style={styles.insertGivenBox}>
        <div style={styles.insertGivenLabel}>[주어진 문장]</div>
        <div style={styles.insertGivenSentence}>{card?.givenSentence || '제공된 문장이 없습니다.'}</div>
      </div>
      <div style={styles.insertContextBox}>
        {(card?.contextLines || []).map((line, idx) => (
          <div key={`context-${idx}`} style={styles.insertContextLine}>{line}</div>
        ))}
      </div>
      <div style={styles.insertOptionGrid}>
        {options.map((option) => {
          const isActive = selected === option.label;
          return (
            <button
              key={`insert-${option.label}`}
              type="button"
              style={{
                ...styles.insertOption,
                ...(isActive ? styles.insertOptionSelected : {}),
              }}
              onClick={() => handleSelect(option.label)}
            >
              <span style={styles.insertOptionLabel}>{option.label}</span>
              <span style={styles.insertOptionText}>{option.text}</span>
            </button>
          );
        })}
      </div>
      {reveal && (
        <div style={styles.insertAnswer}>정답: {answer || '추후 제공 예정'}</div>
      )}
    </div>
  );
};

const WordOrderInputPuzzle = ({ card, reveal, compact = false }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [card]);

  const handleTokenClick = useCallback((token) => {
    setValue((prev) => (prev ? `${prev} ${token}` : token));
  }, []);

  const normalizedAnswer = (card?.answer || '').trim();
  const normalizedInput = value.trim();
  const isCorrect = normalizedAnswer && normalizedInput.toLowerCase() === normalizedAnswer.toLowerCase();

  return (
    <div style={styles.puzzleContainer}>
      {Array.isArray(card?.tokens) && card.tokens.length > 0 && (
        <div style={styles.puzzleTokenTray}>
          {card.tokens.map((token, index) => (
            <button
              key={`input-token-${index}`}
              type="button"
              style={compact
                ? { ...styles.puzzleTokenButton, ...styles.puzzleTokenButtonMobile }
                : styles.puzzleTokenButton}
              onClick={() => handleTokenClick(token)}
            >
              {token}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="문장을 직접 완성해 보세요."
        style={compact
          ? { ...styles.puzzleInput, ...styles.puzzleInputMobile }
          : styles.puzzleInput}
      />
      <div style={styles.puzzleStatus}>
        현재 입력: {value || '—'} {normalizedAnswer ? (isCorrect ? '✅' : '') : ''}
      </div>
      {reveal && normalizedAnswer && (
        <div style={styles.puzzleStatus}>정답: {normalizedAnswer}</div>
      )}
    </div>
  );
};

const TestWordOrderQuestion = ({ question, value = [], onChange }) => {
  const [available, setAvailable] = useState([]);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    const tokens = Array.isArray(question?.tokens)
      ? question.tokens.map((text, index) => ({ key: `${index}-${text}`, text }))
      : [];

    if (Array.isArray(value) && value.length) {
      const pickedTokens = [];
      const remainingTokens = [...tokens];
      value.forEach((text) => {
        const matchIndex = remainingTokens.findIndex((token) => token.text === text);
        if (matchIndex >= 0) {
          pickedTokens.push(remainingTokens[matchIndex]);
          remainingTokens.splice(matchIndex, 1);
        }
      });
      setPicked(pickedTokens);
      setAvailable(remainingTokens);
    } else {
      setPicked([]);
      setAvailable(tokens);
    }
  }, [question, value]);

  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange(picked.map((token) => token.text));
    }
  }, [picked, onChange]);

  const handlePick = useCallback((token) => {
    setAvailable((prev) => prev.filter((item) => item.key !== token.key));
    setPicked((prev) => [...prev, token]);
  }, []);

  const handleRemove = useCallback((index) => {
    setPicked((prevPicked) => {
      const token = prevPicked[index];
      if (!token) return prevPicked;
      setAvailable((prev) => [...prev, token]);
      return prevPicked.filter((_, i) => i !== index);
    });
  }, []);

  const handleReset = useCallback(() => {
    const tokens = Array.isArray(question?.tokens)
      ? question.tokens.map((text, index) => ({ key: `${index}-${text}`, text }))
      : [];
    setPicked([]);
    setAvailable(tokens);
    if (typeof onChange === 'function') {
      onChange([]);
    }
  }, [question, onChange]);

  return (
    <div style={styles.puzzleContainer}>
      <div style={styles.puzzleSelectedRow}>
        {picked.length === 0 && <span style={styles.puzzleStatus}>단어를 눌러 순서대로 배치해 보세요.</span>}
        {picked.map((token, index) => (
          <button
            type="button"
            key={`test-picked-${token.key}`}
            style={styles.puzzleSelectedToken}
            onClick={() => handleRemove(index)}
          >
            {token.text}
          </button>
        ))}
      </div>
      <div style={styles.puzzleTokenTray}>
        {available.map((token) => (
          <button
            type="button"
            key={`test-available-${token.key}`}
            style={styles.puzzleTokenButton}
            onClick={() => handlePick(token)}
          >
            {token.text}
          </button>
        ))}
        {available.length === 0 && picked.length > 0 && (
          <span style={styles.puzzleStatus}>모든 단어를 사용했어요!</span>
        )}
      </div>
      <div style={styles.puzzleControls}>
        <button type="button" style={styles.secondaryButton} onClick={handleReset}>
          퍼즐 초기화
        </button>
        <span style={styles.puzzleStatus}>현재 조합: {picked.map((token) => token.text).join(' ') || '—'}</span>
      </div>
    </div>
  );
};

const GrammarReviewCard = ({ card, reveal }) => {
  const frontText = typeof card?.front === 'string' ? card.front : '';
  const backText = typeof card?.back === 'string' ? card.back : '';

  return (
    <div style={styles.flashcardCenter}>
      <div style={styles.flashcardFrontInteractive}>{frontText}</div>
      {reveal && (
        <div style={{ ...styles.flashcardBack, marginTop: '16px', borderTop: '1px dashed var(--border-strong)', paddingTop: '16px' }}>
          {backText}
        </div>
      )}
    </div>
  );
};

const TestWordOrderInputQuestion = ({ question, value = '', onChange }) => {
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value, question]);

  const handleTokenClick = useCallback((token) => {
    setInputValue((prev) => {
      const next = prev ? `${prev} ${token}` : token;
      if (typeof onChange === 'function') {
        onChange(next);
      }
      return next;
    });
  }, [onChange]);

  const handleChange = useCallback((event) => {
    const next = event.target.value;
    setInputValue(next);
    if (typeof onChange === 'function') {
      onChange(next);
    }
  }, [onChange]);

  return (
    <div style={styles.puzzleContainer}>
      {Array.isArray(question?.tokens) && question.tokens.length > 0 && (
        <div style={styles.puzzleTokenTray}>
          {question.tokens.map((token, index) => (
            <button
              key={`test-input-token-${index}`}
              type="button"
              style={styles.puzzleTokenButton}
              onClick={() => handleTokenClick(token)}
            >
              {token}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="문장을 직접 완성해 보세요."
        style={styles.puzzleInput}
      />
      <div style={styles.puzzleStatus}>현재 입력: {inputValue || '—'}</div>
    </div>
  );
};

const WorkbookPage = () => {
  const { user, updateUser } = useAuth();
  const canManageWorkbooks = isTeacherOrAdmin(user?.role);
  const canCreateWorkbooks = isProOrHigher(user?.role, user?.membership);

  const [isMobile, setIsMobile] = useState(false);
  const [workbooks, setWorkbooks] = useState([]);
  const [workbookCache, setWorkbookCache] = useState({});
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [selectedWorkbookId, setSelectedWorkbookId] = useState(null);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const [completedSteps, setCompletedSteps] = useState(() => loadCompletedFromStorage());

  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorStage, setGeneratorStage] = useState(1);
  const [documents, setDocuments] = useState([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [overviewSearch, setOverviewSearch] = useState('');
  const [passages, setPassages] = useState([]);
  const [passagesLoading, setPassagesLoading] = useState(false);
  const [passagesError, setPassagesError] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedPassage, setSelectedPassage] = useState('1');
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState('');
  const [activeDocumentId, setActiveDocumentId] = useState('');
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  
  // Passage Preview Modal State
  const [previewPassageText, setPreviewPassageText] = useState(null);

  const [isTestMode, setIsTestMode] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [testQuestions, setTestQuestions] = useState([]);
  const [testAnswers, setTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testWorkbookMeta, setTestWorkbookMeta] = useState(null);

  const selectedWorkbook = selectedWorkbookId ? workbookCache[selectedWorkbookId] : null;

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 768);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const responsiveStyle = useCallback((base, mobileOverrides = {}) => (
    isMobile ? { ...base, ...(mobileOverrides || {}) } : base
  ), [isMobile]);

  const documentsForWorkbook = useMemo(() => (
    Array.isArray(documents)
      ? documents.filter((doc) => String(doc.type || '').toLowerCase() !== 'vocabulary')
      : []
  ), [documents]);

  const filteredDocuments = useMemo(() => {
    if (!documentSearch.trim()) return documentsForWorkbook;
    const keyword = documentSearch.trim().toLowerCase();
    return documentsForWorkbook.filter((doc) => {
      const fields = [doc.title, doc.category, doc.school];
      return fields.some((field) => String(field || '').toLowerCase().includes(keyword));
    });
  }, [documentsForWorkbook, documentSearch]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documentsForWorkbook.find((doc) => String(doc.id) === String(selectedDocumentId)) || null;
  }, [documentsForWorkbook, selectedDocumentId]);


  const documentsById = useMemo(() => {
    const map = {};
    (documents || []).forEach((doc) => {
      map[String(doc.id)] = doc;
    });
    return map;
  }, [documents]);

  const workbookGroups = useMemo(() => {
    if (!Array.isArray(workbooks) || workbooks.length === 0) {
      return [];
    }

    const lookup = {};
    const groups = [];

    workbooks.forEach((item) => {
      const key = String(item.documentId);
      if (!lookup[key]) {
        const docMeta = documentsById[key] || {};
        lookup[key] = {
          documentId: item.documentId,
          documentTitle: item.documentTitle || docMeta.title || '제목 미지정 자료',
          category: docMeta.category || '미지정',
          grade: docMeta.grade || null,
          type: docMeta.type || null,
          school: docMeta.school || null,
          workbooks: []
        };
        groups.push(lookup[key]);
      }
      lookup[key].workbooks.push(item);
    });

    groups.forEach((group) => {
      group.workbooks.sort((a, b) => {
        const left = Number(a.passageNumber) || 0;
        const right = Number(b.passageNumber) || 0;
        return left - right;
      });
    });

    groups.sort((a, b) => {
      const left = (a.documentTitle || '').toLowerCase();
      const right = (b.documentTitle || '').toLowerCase();
      return left.localeCompare(right, 'ko');
    });

    return groups;
  }, [workbooks, documentsById]);

  const workbookGroupsById = useMemo(() => {
    const map = {};
    workbookGroups.forEach((group) => {
      map[String(group.documentId)] = group;
    });
    return map;
  }, [workbookGroups]);

  const filteredDocumentGroups = useMemo(() => {
    if (!overviewSearch.trim()) {
      return workbookGroups;
    }
    const keyword = overviewSearch.trim().toLowerCase();
    return workbookGroups.filter((group) => {
      const docMeta = documentsById[String(group.documentId)] || {};
      const fields = [
        group.documentTitle,
        group.category,
        docMeta.school,
        docMeta.type
      ];
      return fields.some((field) => String(field || '').toLowerCase().includes(keyword));
    });
  }, [overviewSearch, workbookGroups, documentsById]);

  const activeGroup = useMemo(() => {
    if (activeDocumentId && workbookGroupsById[activeDocumentId]) {
      return workbookGroupsById[activeDocumentId];
    }
    if (filteredDocumentGroups.length > 0) {
      return filteredDocumentGroups[0];
    }
    return workbookGroups[0] || null;
  }, [activeDocumentId, workbookGroupsById, filteredDocumentGroups, workbookGroups]);

  useEffect(() => {
    if (!workbookGroups.length) {
      setActiveDocumentId('');
      return;
    }

    setActiveDocumentId((prev) => {
      const prevKey = String(prev || '');
      if (prevKey && workbookGroupsById[prevKey]) {
        const stillVisible = filteredDocumentGroups.some((group) => String(group.documentId) === prevKey);
        if (stillVisible) {
          return prevKey;
        }
      }

      const fallback = filteredDocumentGroups[0] || workbookGroups[0];
      return fallback ? String(fallback.documentId) : '';
    });
  }, [workbookGroups, workbookGroupsById, filteredDocumentGroups]);

  const selectedPassageNumber = useMemo(() => {
    const numeric = Number(selectedPassage);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  }, [selectedPassage]);

  const selectedPassageInfo = useMemo(() => {
    if (!Array.isArray(passages) || !passages.length) return null;
    return passages.find((item) => Number(item.passageNumber) === selectedPassageNumber) || null;
  }, [passages, selectedPassageNumber]);

  const isReadyToGenerate = useMemo(() => {
    if (!selectedDocument) return false;
    if (!passages.length) return false;
    return passages.some((item) => Number(item.passageNumber) === selectedPassageNumber);
  }, [selectedDocument, passages, selectedPassageNumber]);

  const totalSteps = selectedWorkbook?.steps?.length || 0;
  const currentStep = useMemo(() => {
    if (!selectedWorkbook || totalSteps === 0) return null;
    return selectedWorkbook.steps.find((step) => Number(step.step) === Number(currentStepNumber))
      || selectedWorkbook.steps[0];
  }, [selectedWorkbook, currentStepNumber, totalSteps]);

  const currentCard = useMemo(() => {
    const cards = currentStep?.cards;
    if (!Array.isArray(cards) || !cards.length) return null;
    return cards[cardIndex] || cards[0] || null;
  }, [currentStep, cardIndex]);

  const shouldLeftAlignCard = useMemo(() => {
    if (!currentStep) return false;
    const stepNumber = Number(currentStep.step);
    if (stepNumber === 7 || stepNumber === 8) return true;
    const type = currentCard?.type;
    if (type && ['sentence-insert', 'paragraph-order', 'paragraph-sequence'].includes(type)) {
      return true;
    }
    const frontText = typeof currentCard?.front === 'string' ? currentCard.front : '';
    if (frontText.includes('[문단 배열') || frontText.includes('[문장 삽입')) {
      return true;
    }
    return false;
  }, [currentStep, currentCard]);

  const currentStepNumberValue = Number(currentStep?.step || 1);
  const hasPrevStep = currentStepNumberValue > 1;
  const hasNextStep = totalSteps > 0 && currentStepNumberValue < totalSteps;

  const handleOpenWorkbook = useCallback((id, step = 1) => {
    if (typeof window === 'undefined') return;
    const normalizedStep = Math.max(1, step);
    window.history.pushState({}, '', `/workbook/${id}?step=${normalizedStep}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const handleStepChange = useCallback((stepNumber) => {
    if (!selectedWorkbookId) return;
    handleOpenWorkbook(selectedWorkbookId, stepNumber);
  }, [handleOpenWorkbook, selectedWorkbookId]);

  const renderStepButtons = useCallback(() => {
    if (!selectedWorkbook) return null;
    return selectedWorkbook.steps.map((step) => {
      const isActive = Number(step.step) === Number(currentStepNumber);
      return (
        <button
          key={step.step}
          type="button"
          className="tilt-hover"
          style={{
            ...responsiveStyle(styles.stepButton, styles.stepButtonMobile),
            ...(isActive ? styles.stepButtonActive : {})
          }}
          onClick={() => handleStepChange(step.step)}
        >
          {step.label}
        </button>
      );
    });
  }, [selectedWorkbook, currentStepNumber, handleStepChange, responsiveStyle]);

  const isStepCompleted = useMemo(() => {
    if (!selectedWorkbookId) return false;
    const stored = completedSteps[selectedWorkbookId];
    if (!Array.isArray(stored)) return false;
    return stored.includes(currentStepNumber);
  }, [completedSteps, currentStepNumber, selectedWorkbookId]);

  const completionSummary = useMemo(() => {
    const summary = {};
    workbooks.forEach((item) => {
      const stored = completedSteps[item.id];
      const completed = Array.isArray(stored) ? stored.length : 0;
      summary[item.id] = {
        completed,
        total: item.totalSteps || 0
      };
    });
    return summary;
  }, [completedSteps, workbooks]);

  const parseLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const { pathname, search } = window.location;
    const segments = pathname.split('/').filter(Boolean);
    let workbookId = null;
    if (segments[0] === 'workbook' && segments[1]) {
      workbookId = segments[1];
    }
    const params = new URLSearchParams(search);
    const stepParam = Number(params.get('step') || '1');
    const normalizedStep = Number.isNaN(stepParam) || stepParam < 1 ? 1 : stepParam;
    setSelectedWorkbookId(workbookId);
    setCurrentStepNumber(normalizedStep);
    setCardIndex(0);
    setShowBack(false);
  }, []);

  const fetchWorkbooks = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const response = await api.workbooks.list();
      const items = Array.isArray(response?.data) ? response.data : [];
      setWorkbooks(items);
      setWorkbookCache((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          if (!next[item.id]) {
            next[item.id] = prev[item.id] || null;
          }
        });
        return next;
      });
    } catch (error) {
      setListError(error.message || '워크북 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchWorkbookDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await api.workbooks.detail(id);
      if (response?.data) {
        setWorkbookCache((prev) => ({ ...prev, [id]: response.data }));
      }
    } catch (error) {
      setDetailError(error.message || '워크북을 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleBackToOverview = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', '/workbook');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const handleToggleCompletion = useCallback(() => {
    if (!selectedWorkbookId || !currentStep) return;
    setCompletedSteps((prev) => {
      const current = Array.isArray(prev[selectedWorkbookId]) ? new Set(prev[selectedWorkbookId]) : new Set();
      if (current.has(currentStep.step)) {
        current.delete(currentStep.step);
      } else {
        current.add(currentStep.step);
      }
      const next = { ...prev, [selectedWorkbookId]: Array.from(current).sort((a, b) => a - b) };
      saveCompletedToStorage(next);
      return next;
    });
  }, [currentStep, selectedWorkbookId]);

  const handlePrevCard = useCallback(() => {
    if (!currentStep) return;
    setCardIndex((prev) => (prev <= 0 ? 0 : prev - 1));
    setShowBack(false);
  }, [currentStep]);

  const handleNextCard = useCallback(() => {
    if (!currentStep) return;
    setCardIndex((prev) => {
      const next = prev + 1;
      return next >= currentStep.cards.length ? prev : next;
    });
    setShowBack(false);
  }, [currentStep]);

  const handleFlipCard = useCallback(() => {
    setShowBack((prev) => !prev);
  }, []);

  const handleStartTest = useCallback(async () => {
    if (!selectedWorkbookId) return;
    setIsTestMode(true);
    setTestLoading(true);
    setTestError('');
    setTestQuestions([]);
    setTestAnswers({});
    setTestResult(null);
    setTestWorkbookMeta(null);
    try {
      const response = await api.workbooks.test(selectedWorkbookId);
      const payload = response?.data || response;
      if (payload?.workbook) {
        setTestWorkbookMeta(payload.workbook);
      }
      const questions = Array.isArray(payload?.questions) ? payload.questions : [];
      if (!questions.length) {
        setTestError('출제할 수 있는 문제가 부족해요. 워크북을 다시 생성해 주세요.');
      }
      setTestQuestions(questions);
    } catch (error) {
      setTestError(error.message || '워크북 테스트를 준비하지 못했습니다.');
    } finally {
      setTestLoading(false);
    }
  }, [selectedWorkbookId]);

  const handleExitTest = useCallback(() => {
    setIsTestMode(false);
    setTestLoading(false);
    setTestError('');
    setTestQuestions([]);
    setTestAnswers({});
    setTestResult(null);
    setTestSubmitting(false);
    setTestWorkbookMeta(null);
  }, []);

  const handleRetakeTest = useCallback(() => {
    setTestAnswers({});
    setTestResult(null);
    handleStartTest();
  }, [handleStartTest]);

  const handleTestAnswerChange = useCallback((questionId, answer) => {
    setTestAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  const handleSubmitTest = useCallback(async () => {
    if (!selectedWorkbookId || !testQuestions.length) return;
    const payloadAnswers = testQuestions.map((question) => {
      const raw = testAnswers[question.id];
      let normalized = raw;
      switch (question.type) {
        case 'multi-blank': {
          const blanks = question.blanks || (Array.isArray(question.answers) ? question.answers.length : 2);
          if (Array.isArray(raw)) {
            const trimmed = raw.slice(0, blanks);
            while (trimmed.length < blanks) {
              trimmed.push('');
            }
            normalized = trimmed;
          } else {
            normalized = Array.from({ length: blanks }, () => '');
          }
          break;
        }
        case 'single-blank':
        case 'word-order-input':
        case 'grammar-choice':
        case 'sentence-insert':
          normalized = typeof raw === 'string' ? raw : '';
          break;
        case 'word-order':
          normalized = Array.isArray(raw) ? raw : [];
          break;
        default:
          normalized = raw;
      }
      return {
        questionId: question.id,
        type: question.type,
        answer: normalized
      };
    });

    setTestSubmitting(true);
    setTestError('');
    try {
      const response = await api.workbooks.submitTest(selectedWorkbookId, { answers: payloadAnswers });
      const payload = response?.data || response;
      setTestResult(payload);
      if (payload?.updatedUser && typeof updateUser === 'function') {
        updateUser(payload.updatedUser);
      }
    } catch (error) {
      setTestError(error.message || '워크북 테스트를 채점하지 못했습니다.');
    } finally {
      setTestSubmitting(false);
    }
  }, [selectedWorkbookId, testQuestions, testAnswers, updateUser]);

  const renderTestQuestion = (question, index) => {
    const value = testAnswers[question.id];
    const questionNumber = index + 1;

    const renderBlankInputs = (blanks) => {
      const values = Array.isArray(value)
        ? value.slice(0, blanks)
        : Array.from({ length: blanks }, () => '');
      while (values.length < blanks) {
        values.push('');
      }
      return (
        <div style={styles.testInputsRow}>
          {values.map((item, blankIndex) => (
            <input
              key={`${question.id}-blank-${blankIndex}`}
              type="text"
              value={item}
              onChange={(event) => {
                const next = [...values];
                next[blankIndex] = event.target.value;
                handleTestAnswerChange(question.id, next);
              }}
              placeholder={`빈칸 ${blankIndex + 1}`}
              style={styles.testInput}
            />
          ))}
        </div>
      );
    };

    const renderChoiceOptions = (options = []) => {
      const selected = typeof value === 'string' ? value : '';
      return (
        <div style={styles.testOptionList}>
          {options.map((option) => {
            const isSelected = selected === option.label;
            return (
              <label
                key={`${question.id}-option-${option.label}`}
                style={{
                  ...styles.testOptionItem,
                  ...(isSelected ? styles.testOptionItemSelected : {})
                }}
              >
                <input
                  type="radio"
                  name={`test-question-${question.id}`}
                  value={option.label}
                  checked={isSelected}
                  onChange={() => handleTestAnswerChange(question.id, option.label)}
                  style={{ marginRight: '8px' }}
                />
                <strong>{option.label}</strong>
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      );
    };

    return (
      <div key={question.id} style={styles.testQuestionCard}>
        <div style={styles.testQuestionHeader}>
          <span>문항 {questionNumber}</span>
          <span style={{ color: 'var(--tone-muted)', fontSize: '12px' }}>{question.stepLabel || ''}</span>
        </div>
        {question.prompt && <div style={styles.testQuestionPrompt}>{question.prompt}</div>}
        {question.givenSentence && (
          <div style={styles.testHint}>[주어진 문장] {question.givenSentence}</div>
        )}
        {Array.isArray(question.contextLines) && question.contextLines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {question.contextLines.map((line, lineIndex) => (
              <div key={`${question.id}-context-${lineIndex}`} style={styles.testQuestionPrompt}>
                {line}
              </div>
            ))}
          </div>
        )}
        {question.type === 'single-blank' && (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleTestAnswerChange(question.id, event.target.value)}
            placeholder="빈칸에 들어갈 표현을 입력하세요"
            style={styles.testInput}
          />
        )}

        {question.type === 'multi-blank' && (
          renderBlankInputs(question.blanks || 2)
        )}

        {question.type === 'grammar-choice' && renderChoiceOptions(question.options)}

        {question.type === 'sentence-insert' && renderChoiceOptions(question.options)}

        {question.type === 'word-order' && (
          <TestWordOrderQuestion
            question={question}
            value={Array.isArray(value) ? value : []}
            onChange={(next) => handleTestAnswerChange(question.id, next)}
          />
        )}

        {question.type === 'word-order-input' && (
          <TestWordOrderInputQuestion
            question={question}
            value={typeof value === 'string' ? value : ''}
            onChange={(next) => handleTestAnswerChange(question.id, next)}
          />
        )}
      </div>
    );
  };

  const renderResultDetail = (detail, index) => {
    const question = detail.question || {};
    const badgeStyle = detail.correct ? styles.resultBadgeCorrect : styles.resultBadgeIncorrect;
    return (
      <div key={detail.questionId || index} style={styles.testQuestionCard}>
        <div style={styles.testQuestionHeader}>
          <span>문항 {index + 1}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {question.stepLabel && <span style={{ color: 'var(--tone-muted)', fontSize: '12px' }}>{question.stepLabel}</span>}
            <span style={badgeStyle}>{detail.correct ? '정답' : '오답'}</span>
          </div>
        </div>
        {question.prompt && <div style={styles.testQuestionPrompt}>{question.prompt}</div>}
        {question.givenSentence && (
          <div style={styles.testHint}>[주어진 문장] {question.givenSentence}</div>
        )}
        {Array.isArray(question.contextLines) && question.contextLines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {question.contextLines.map((line, lineIndex) => (
              <div key={`${detail.questionId}-context-${lineIndex}`} style={styles.testQuestionPrompt}>
                {line}
              </div>
            ))}
          </div>
        )}
        <div><strong>내 답</strong>: {detail.userAnswer ? detail.userAnswer : '미응답'}</div>
        <div><strong>정답</strong>: {detail.correctAnswer || '-'}</div>
        {detail.explanation && (
          <div style={styles.testHint}>해설: {detail.explanation}</div>
        )}
      </div>
    );
  };

  const renderTestView = () => {
    const workbookMeta = testWorkbookMeta || selectedWorkbook || {};
    return (
      <div style={styles.detailContainer}>
        <div style={styles.detailHeader}>
          <div style={styles.testHeaderRow}>
            <button type="button" style={styles.secondaryButton} onClick={handleExitTest}>
              ← 학습 모드로 돌아가기
            </button>
            <div style={styles.pill}>Workbook · {workbookMeta.documentTitle || selectedWorkbook?.documentTitle || '선택한 자료'}</div>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>워크북 TEST</h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--tone-strong)' }}>
            학습한 내용을 바탕으로 테스트를 진행해 보세요. 모든 문항을 풀고 제출하면 즉시 채점되고 LP가 반영됩니다.
          </p>
        </div>

        <div style={styles.testContainer}>
          {testError && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(248,113,113,0.4)',
                background: 'rgba(248,113,113,0.12)',
                color: 'rgb(220,38,38)'
              }}
            >
              {testError}
            </div>
          )}

          {testLoading ? (
            <div style={styles.generatorEmpty}>테스트 문제를 준비하고 있어요... ⏳</div>
          ) : testResult ? (
            <>
              <div style={styles.testResultCard}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>채점 결과</h3>
                <div>총 {testResult.summary?.total || 0}문항 중 <strong>{testResult.summary?.correct || 0}</strong>개 정답</div>
                <div>정확도 {testResult.summary?.accuracy ?? 0}%</div>
                <div>
                  LP 변화 {testResult.summary?.pointsDelta >= 0 ? '+' : ''}{testResult.summary?.pointsDelta || 0} → 현재 {testResult.summary?.totalPoints || 0}
                </div>
                {testResult.rank?.rank && (
                  <div>현재 랭크: {testResult.rank.rank}위</div>
                )}
              </div>
              <div style={styles.testSubmitRow}>
                <button type="button" style={styles.primaryButton} onClick={handleRetakeTest} disabled={testSubmitting}>
                  다시 테스트 보기
                </button>
                <button type="button" style={styles.secondaryButton} onClick={handleExitTest}>
                  학습 모드로 돌아가기
                </button>
              </div>
              <div style={styles.testQuestionList}>
                {(testResult.details || []).map((detail, index) => renderResultDetail(detail, index))}
              </div>
            </>
          ) : (
            testQuestions.length > 0 ? (
              <>
                <div style={styles.testQuestionList}>
                  {testQuestions.map((question, index) => renderTestQuestion(question, index))}
                </div>
                <div style={styles.testSubmitRow}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={handleSubmitTest}
                    disabled={testSubmitting}
                  >
                    {testSubmitting ? '채점 중...' : '채점하기'}
                  </button>
                  <span style={styles.testHint}>제출하면 즉시 채점되고 LP가 반영됩니다.</span>
                </div>
              </>
            ) : (
              <div style={styles.generatorEmpty}>출제할 문제가 없어요. 워크북을 다시 생성해 주세요.</div>
            )
          )}
        </div>
      </div>
    );
  };

  const handleSelectDocument = useCallback(async (doc) => {
    const value = doc ? String(doc.id) : '';
    setSelectedDocumentId(value);
    setSelectedPassage('1');
    setPassages([]);
    setPassagesError('');
    if (!value) return;
    try {
      setPassagesLoading(true);
      const response = await api.analysis.listPassageSummaries(value);
      const list = Array.isArray(response?.data) ? response.data : [];
      setPassages(list);
      if (list.length > 0) {
        setSelectedPassage(String(list[0].passageNumber || 1));
      }
      setGeneratorStage(2);
    } catch (error) {
      setPassagesError(error.message || '지문 목록을 불러오지 못했습니다.');
    } finally {
      setPassagesLoading(false);
    }
  }, []);

  const handleOpenGenerator = useCallback(async (initialDocumentId = '') => {
    setGeneratorError('');
    setPassagesError('');
    setDocumentSearch('');
    setPassages([]);
    setSelectedPassage('1');
    setGeneratorStage(1);

    const normalizedId = initialDocumentId ? String(initialDocumentId) : '';
    setSelectedDocumentId(normalizedId);
    setShowGenerator(true);

    try {
      let docs = documents;
      if (!docs.length) {
        const response = await api.documents.list();
        docs = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setDocuments(docs);
      }

      if (normalizedId) {
        const targetDoc = docs.find((doc) => String(doc.id) === normalizedId);
        if (targetDoc) {
          await handleSelectDocument(targetDoc);
        }
      }
    } catch (error) {
      setGeneratorError(error.message || '문서 목록을 불러오지 못했습니다.');
    }
  }, [documents, handleSelectDocument]);

  const handleGenerateWorkbook = useCallback(async () => {
    if (!selectedDocumentId) {
      setGeneratorError('문서를 선택해 주세요.');
      return;
    }
    setGeneratorLoading(true);
    setGeneratorError('');
    try {
      const payload = {
        documentId: Number(selectedDocumentId),
        passageNumber: Number(selectedPassage) || 1,
        regenerate: false
      };
      const response = await api.workbooks.generate(payload);
      if (response?.data) {
        setWorkbookCache((prev) => ({ ...prev, [response.data.id]: response.data }));
        await fetchWorkbooks();
        setShowGenerator(false);
        handleOpenWorkbook(response.data.id, 1);
      }
    } catch (error) {
      setGeneratorError(error.message || '워크북 생성에 실패했습니다.');
    } finally {
      setGeneratorLoading(false);
    }
  }, [fetchWorkbooks, handleOpenWorkbook, selectedDocumentId, selectedPassage]);

  const handleCloseGenerator = useCallback(() => {
    setShowGenerator(false);
    setGeneratorStage(1);
  }, []);

  const handleSelectOverviewDocument = useCallback((docId) => {
    const key = String(docId || '');
    setActiveDocumentId(key);
  }, []);

  const handleDeleteWorkbook = useCallback(async (id, title) => {
    if (!id) return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`${title || '워크북'}을(를) 삭제할까요? 삭제하면 복구할 수 없어요.`);
      if (!ok) {
        return;
      }
    }

    const key = String(id);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      await api.workbooks.delete(id);
      setWorkbooks((prev) => prev.filter((item) => String(item.id) !== key));
      setWorkbookCache((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCompletedSteps((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        saveCompletedToStorage(next);
        return next;
      });

      await fetchWorkbooks();

      if (String(selectedWorkbookId) === key) {
        handleBackToOverview();
      }
    } catch (error) {
      const message = String(error?.message || '');
      const notFound = message.includes('찾을 수 없습니다');
      if (!notFound && typeof window !== 'undefined') {
        window.alert(message || '워크북을 삭제하지 못했습니다.');
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [fetchWorkbooks, handleBackToOverview, selectedWorkbookId]);

  useEffect(() => {
    fetchWorkbooks();
  }, [fetchWorkbooks]);

  useEffect(() => {
    parseLocation();
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', parseLocation);
    return () => window.removeEventListener('popstate', parseLocation);
  }, [parseLocation]);

  useEffect(() => {
    let ignore = false;
    const loadDocuments = async () => {
      try {
        const response = await api.documents.list();
        const docs = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        if (!ignore && Array.isArray(docs)) {
          setDocuments(docs);
        }
      } catch (error) {
        console.warn('[workbooks] 문서 목록 로드 실패:', error?.message || error);
      }
    };
    loadDocuments();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedWorkbookId) return;
    if (!workbookCache[selectedWorkbookId]) {
      fetchWorkbookDetail(selectedWorkbookId);
    }
  }, [fetchWorkbookDetail, selectedWorkbookId, workbookCache]);

  useEffect(() => {
    if (!selectedWorkbook) return;
    if (currentStepNumber > selectedWorkbook.steps.length) {
      setCurrentStepNumber(selectedWorkbook.steps[0]?.step || 1);
      setCardIndex(0);
      setShowBack(false);
    }
  }, [selectedWorkbook, currentStepNumber]);

  const isDetailPending = Boolean(selectedWorkbookId) && (!selectedWorkbook || detailLoading);

  if (listError) {
    return (
      <FriendlyError
        error={{ summary: listError }}
        onRetry={fetchWorkbooks}
        onHome={() => handleBackToOverview()}
      />
    );
  }

  if (loadingList) {
    return (
      <div style={styles.emptyState}>
        워크북 목록을 불러오는 중이에요... ⏳
      </div>
    );
  }

  if (isDetailPending) {
    return (
      <div style={styles.emptyState}>
        워크북을 불러오는 중이에요... ⏳
      </div>
    );
  }

  if (!selectedWorkbook) {
    const stageLabels = ['자료 선택', '지문 선택', '생성 확인'];
    const currentStageName = stageLabels[Math.min(Math.max(generatorStage, 1), stageLabels.length) - 1];

    return (
      <div style={responsiveStyle(styles.container, styles.containerMobile)}>
        <CommonHero
          badge="Workbook"
          title="분석에서 학습까지, 한 호흡으로 정리"
          subtitle="분석이 끝난 지문을 선택해 워크북을 만들면, 10단계 미션으로 자연스럽게 복습할 수 있어요."
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {canCreateWorkbooks && (
            <button
              type="button"
              data-testid="open-workbook-generator"
              style={responsiveStyle(styles.primaryButton, styles.primaryButtonMobile)}
              onClick={() => handleOpenGenerator()}
            >
              + 새 워크북 생성하기
            </button>
          )}
          <EagleGuideChip text="분석이 끝난 지문을 골라 워크북을 만들면 돼요" variant="accent" />
        </div>

        {showGenerator && canCreateWorkbooks && (
          <section style={responsiveStyle(styles.wizardContainer, styles.wizardContainerMobile)}>
            <div style={styles.wizardHeaderRow}>
              <div>
                <span style={styles.wizardProgress}>STEP {generatorStage}/3 · {currentStageName}</span>
                <h2 style={responsiveStyle(styles.wizardStageTitle, styles.wizardStageTitleMobile)}>새 워크북 만들기</h2>
              </div>
              <button
                type="button"
                style={responsiveStyle(styles.wizardCloseButton, styles.wizardCloseButtonMobile)}
                onClick={handleCloseGenerator}
              >
                닫기
              </button>
            </div>

            {generatorStage === 1 && (
              <div style={responsiveStyle(styles.wizardStageBody, styles.wizardStageBodyMobile)}>
                <EagleGuideChip text="분석이 완료된 문서를 골라야 다음 단계로 이동할 수 있어요" />
                <p style={responsiveStyle(styles.wizardStageDescription, styles.wizardStageDescriptionMobile)}>
                  분석이 완료된 문서를 골라 주세요. 선택하면 자동으로 지문 선택 단계로 이동해요.
                </p>
                <div style={styles.generatorSearchRow}>
                  <input
                    type="search"
                    value={documentSearch}
                    onChange={(event) => setDocumentSearch(event.target.value)}
                    placeholder="자료 제목·학교·분류를 검색해 보세요"
                    style={styles.generatorSearchInput}
                  />
                </div>
                {filteredDocuments.length === 0 ? (
                  <div style={styles.generatorEmpty}>검색 결과가 없어요. 다른 키워드를 입력해 보세요.</div>
                ) : (
                  <div style={responsiveStyle(styles.generatorDocGrid, styles.generatorDocGridMobile)}>
                    {filteredDocuments.map((doc) => {
                      const isActive = String(doc.id) === String(selectedDocumentId);
                      const uploadedAt = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-';
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          data-testid="workbook-document-card"
                          className="tilt-hover"
                          style={{
                            ...styles.generatorDocCard,
                            ...(isActive ? styles.generatorDocCardActive : {})
                          }}
                          onClick={() => handleSelectDocument(doc)}
                        >
                          <div className="shimmer" aria-hidden />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={styles.generatorDocTitle}>{doc.title}</h4>
                            {isActive && <span style={styles.wizardStageBadge}>선택됨</span>}
                          </div>
                          <p style={styles.generatorDocMeta}>분류: {doc.category || '미지정'}</p>
                          <p style={styles.generatorDocMeta}>업로드: {uploadedAt}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {generatorError && <div style={styles.generatorErrorBox}>{generatorError}</div>}
              </div>
            )}

            {generatorStage === 2 && (
              <div style={responsiveStyle(styles.wizardStageBody, styles.wizardStageBodyMobile)}>
                <EagleGuideChip text="지문을 탭하면 바로 미리보기를 열어 드려요" />
                <div style={styles.wizardInfoCard}>
                  <span style={styles.wizardStageBadge}>선택한 자료</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{selectedDocument?.title || '자료를 다시 선택해 주세요.'}</strong>
                  <span style={styles.generatorDocMeta}>
                    {(selectedDocument?.category || '분류 미지정')} · {(selectedDocument?.school || '학교 미지정')}
                  </span>
                </div>
                {passagesLoading ? (
                  <div style={styles.generatorEmpty}>지문을 불러오는 중이에요... ⏳</div>
                ) : passagesError ? (
                  <div style={styles.generatorErrorBox}>{passagesError}</div>
                ) : !passages.length ? (
                  <div style={styles.generatorEmpty}>이 자료에는 아직 분석된 지문이 없어요. 분석을 먼저 생성해 주세요.</div>
                ) : (
                  <div style={responsiveStyle(styles.generatorPassageList, styles.generatorPassageListMobile)}>
                    {passages.map((item) => {
                      const isActive = Number(item.passageNumber) === selectedPassageNumber;
                      return (
                        <button
                          key={`passage-${item.passageNumber}`}
                          type="button"
                          data-testid="workbook-passage-card"
                          className="tilt-hover"
                          style={{
                            ...styles.generatorPassageCard,
                            ...(isActive ? styles.generatorPassageCardActive : {})
                          }}
                          onClick={() => setSelectedPassage(String(item.passageNumber))}
                        >
                          <div className="shimmer" aria-hidden />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>지문 {item.passageNumber}</strong>
                            <button
                              type="button"
                              style={{
                                padding: '4px 10px',
                                borderRadius: '99px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPassageText({
                                  title: `지문 ${item.passageNumber}`,
                                  text: item.originalPassage || item.text || item.excerpt || '본문 내용을 불러올 수 없습니다.'
                                });
                              }}
                            >
                              🔍 미리보기
                            </button>
                          </div>
                          <div style={styles.generatorPassageExcerpt}>
                            {item.excerpt || '지문 미리보기를 준비했어요.'}
                          </div>
                          {typeof item.variantCount === 'number' && (
                            <span style={styles.generatorDocMeta}>분석본 {item.variantCount}개</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={responsiveStyle(styles.wizardFooter, styles.wizardFooterMobile)}>
                  <button
                    type="button"
                    style={styles.wizardSecondaryButton}
                    onClick={() => setGeneratorStage(1)}
                  >
                    ← 자료 다시 고르기
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.wizardPrimaryButton,
                      opacity: isReadyToGenerate ? 1 : 0.6,
                      cursor: isReadyToGenerate ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => setGeneratorStage(3)}
                    disabled={!isReadyToGenerate}
                  >
                    다음 단계
                  </button>
                </div>
              </div>
            )}

            {generatorStage === 3 && (
              <div style={responsiveStyle(styles.wizardStageBody, styles.wizardStageBodyMobile)}>
                <EagleGuideChip text="출제 범위와 문제 수를 확인한 뒤 생성 버튼을 눌러요" />
                <div style={styles.wizardInfoCard}>
                  <span style={styles.wizardStageBadge}>선택한 지문</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                    {selectedDocument?.title || '자료 미선택'} · 지문 {selectedPassageNumber}
                  </strong>
                  <span style={styles.generatorDocMeta}>
                    {selectedPassageInfo?.variantCount ? `분석본 ${selectedPassageInfo.variantCount}개` : '분석본 확보'}
                  </span>
                </div>
                {selectedPassageInfo?.excerpt ? (
                  <div style={styles.wizardInfoCard}>
                    <span style={styles.wizardStageBadge}>미리보기</span>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--tone-strong)' }}>
                      {selectedPassageInfo.excerpt}
                    </p>
                  </div>
                ) : (
                  <div style={styles.generatorEmpty}>지문 미리보기를 불러오지 못했어요. 그래도 워크북 생성은 진행할 수 있습니다.</div>
                )}
                {generatorError && <div style={styles.generatorErrorBox}>{generatorError}</div>}
                <div style={responsiveStyle(styles.wizardFooter, styles.wizardFooterMobile)}>
                  <button
                    type="button"
                    style={styles.wizardSecondaryButton}
                    onClick={() => setGeneratorStage(2)}
                  >
                    ← 지문 다시 고르기
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.wizardPrimaryButton,
                      opacity: generatorLoading ? 0.7 : 1,
                      cursor: generatorLoading ? 'wait' : 'pointer'
                    }}
                    onClick={handleGenerateWorkbook}
                    disabled={generatorLoading || !isReadyToGenerate}
                  >
                    {generatorLoading ? '생성 중...' : '워크북 생성하기'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {workbooks.length === 0 ? (
          <div style={styles.emptyState}>
            아직 생성된 워크북이 없어요. 교사/관리자 계정으로 새 워크북을 만들어 주세요. 😊
          </div>
        ) : (
          <section style={responsiveStyle(styles.overviewLayout, styles.overviewLayoutMobile)}>
            <aside style={responsiveStyle(styles.docColumn, styles.docColumnMobile)}>
              <div>
                <input
                  type="search"
                  value={overviewSearch}
                  onChange={(event) => setOverviewSearch(event.target.value)}
                  placeholder="문서 제목이나 분류를 검색해 보세요"
                  style={styles.docSearchInput}
                />
              </div>
              <div style={responsiveStyle(styles.docList, styles.docListMobile)}>
                {filteredDocumentGroups.length === 0 ? (
                  <div style={styles.generatorEmpty}>검색 결과가 없어요. 다른 키워드를 입력해 볼까요?</div>
                ) : (
                  filteredDocumentGroups.map((group) => {
                    const key = String(group.documentId);
                    const isActive = activeGroup && String(activeGroup.documentId) === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        style={{
                          ...responsiveStyle(styles.docListButton, styles.docListButtonMobile),
                          ...(isActive ? styles.docListButtonActive : {})
                        }}
                        onClick={() => handleSelectOverviewDocument(key)}
                      >
                        <p style={styles.docListTitle}>{group.documentTitle}</p>
                        <p style={styles.docListMeta}>
                          {group.category || '분류 미지정'} · 워크북 {group.workbooks.length}개
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <div style={responsiveStyle(styles.docDetail, styles.docDetailMobile)}>
              {activeGroup ? (
                (() => {
                  const docKey = String(activeGroup.documentId);
                  const docMeta = documentsById[docKey] || {};
                  return (
                    <>
                      <div style={styles.docHeaderRow}>
                        <div style={responsiveStyle(styles.docHeaderTop, styles.docHeaderTopMobile)}>
                          <div>
                            <div style={styles.pill}>Workbook Series</div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 0', color: 'var(--text-primary)' }}>{activeGroup.documentTitle}</h2>
                          </div>
                          {canCreateWorkbooks && (
                            <button
                              type="button"
                              style={responsiveStyle(styles.secondaryButton, styles.secondaryButtonMobile)}
                              onClick={() => handleOpenGenerator(activeGroup.documentId)}
                            >
                              + 지문 선택해서 생성
                            </button>
                          )}
                        </div>
                        <div style={responsiveStyle(styles.docMetaInfo, styles.docMetaInfoMobile)}>
                          {activeGroup.category && <span>분류: {activeGroup.category}</span>}
                          {docMeta.grade ? <span>학년: {docMeta.grade}학년</span> : null}
                          {docMeta.school ? <span>학교: {docMeta.school}</span> : null}
                        </div>
                      </div>

                      {activeGroup.workbooks.length === 0 ? (
                        <div style={styles.docEmpty}>이 문서로 만든 워크북이 아직 없어요. 상단 버튼으로 바로 생성해 볼까요? 😊</div>
                      ) : (
                        <div style={styles.workbookList}>
                          {activeGroup.workbooks.map((workbook, index) => {
                            const progress = completionSummary[workbook.id] || { completed: 0, total: workbook.totalSteps };
                            const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
                            const workbookKey = String(workbook.id);
                            const isDeleting = deletingIds.has(workbookKey);
                            return (
                              <div key={workbook.id} className="tilt-hover" style={responsiveStyle(styles.workbookListItem, styles.workbookListItemMobile)}>
                                <div style={responsiveStyle(styles.workbookListItemHeader, styles.workbookListItemHeaderMobile)}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style={styles.workbookIndexBadge}>{index + 1}</span>
                                    <div>
                                      <p style={styles.workbookListTitle}>지문 {workbook.passageNumber}</p>
                                      <p style={styles.workbookStats}>Step {workbook.totalSteps} · 완료 {progress.completed}/{progress.total} ({percent}%)</p>
                                    </div>
                                  </div>
                                  <div style={responsiveStyle(styles.workbookListActions, styles.workbookListActionsMobile)}>
                                    <button
                                      type="button"
                                      style={responsiveStyle(styles.primaryButton, styles.primaryButtonMobile)}
                                      onClick={() => handleOpenWorkbook(workbook.id, 1)}
                                    >
                                      학습 시작하기
                                    </button>
                                    {canManageWorkbooks && (
                                      <button
                                        type="button"
                                        style={{
                                          ...styles.deleteButton,
                                          ...(isDeleting ? styles.deleteButtonDisabled : {})
                                        }}
                                        onClick={() => handleDeleteWorkbook(workbook.id, workbook.title)}
                                        disabled={isDeleting}
                                      >
                                        {isDeleting ? '삭제 중...' : '삭제'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--tone-strong)', margin: 0 }}>
                                  {workbook.description || '8단계 학습 코스로 구성된 워크북입니다.'}
                                </p>
                                <div style={responsiveStyle(styles.docMetaInfo, styles.docMetaInfoMobile)}>
                                  <span>최근 수정: {workbook.updatedAt ? new Date(workbook.updatedAt).toLocaleDateString() : '-'}</span>
                                  <span>Passage {workbook.passageNumber}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <div style={styles.docEmpty}>왼쪽에서 문서를 선택해 주세요.</div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (isTestMode) {
    return renderTestView();
  }

  if (detailError) {
    return (
      <FriendlyError
        error={{ summary: detailError }}
        onRetry={() => fetchWorkbookDetail(selectedWorkbookId)}
        onHome={handleBackToOverview}
      />
    );
  }

  if (!currentStep) {
    return (
      <div style={styles.emptyState}>
        워크북 정보를 준비하는 중이에요... ⏳
      </div>
    );
  }

  const renderFrontContent = () => {
    if (!currentCard) return null;
    if (currentCard.type === 'word-order') {
      return <WordOrderPuzzle card={currentCard} reveal={showBack} compact={isMobile} />;
    }
    if (currentCard.type === 'word-order-input') {
      return <WordOrderInputPuzzle card={currentCard} reveal={showBack} compact={isMobile} />;
    }
    if (currentCard.type === 'paragraph-order') {
      return <ParagraphOrderInteractive card={currentCard} reveal={showBack} />;
    }
    if (currentCard.type === 'sentence-insert') {
      return <SentenceInsertInteractive card={currentCard} reveal={showBack} />;
    }
    if (currentCard.type === 'grammar-review') {
      return <GrammarReviewCard card={currentCard} reveal={showBack} />;
    }
    return currentCard.front;
  };

  return (
    <div style={responsiveStyle(styles.detailContainer, styles.detailContainerMobile)}>
      <div style={responsiveStyle(styles.detailHeader, styles.detailHeaderMobile)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', flexWrap: 'wrap' }}>
          <button type="button" style={responsiveStyle(styles.secondaryButton, styles.secondaryButtonMobile)} onClick={handleBackToOverview}>
            ← 개요로 돌아가기
          </button>
          <div style={styles.pill}>Workbook · {selectedWorkbook.documentTitle}</div>
        </div>
        <h2
          style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}
          data-testid="workbook-detail-title"
        >
          {selectedWorkbook.coverEmoji || '📘'} {selectedWorkbook.title}
        </h2>
        <p
          style={responsiveStyle(
            { fontSize: '15px', lineHeight: 1.7, color: 'var(--tone-strong)' },
            { fontSize: '14px', lineHeight: 1.6 }
          )}
        >
          {selectedWorkbook.description || '지문의 핵심을 8단계로 정리했어요.'}
        </p>
        <div style={styles.testSubmitRow}>
          <button type="button" className="tilt-hover" style={responsiveStyle(styles.primaryButton, styles.primaryButtonMobile)} onClick={handleStartTest}>
            워크북 TEST 시작하기
          </button>
        </div>
      </div>

      {isMobile ? (
        <>
          <div style={styles.mobileStepHeader}>
            <span style={styles.mobileStepIndicator}>STEP {currentStepNumberValue}/{totalSteps || 0}</span>
            <div style={styles.mobileStepNav}>
              <button
                type="button"
                style={{
                  ...styles.mobileNavButton,
                  ...(hasPrevStep ? {} : styles.mobileNavButtonDisabled)
                }}
                onClick={() => hasPrevStep && handleStepChange(currentStepNumberValue - 1)}
                disabled={!hasPrevStep}
              >
                이전
              </button>
              <button
                type="button"
                style={{
                  ...styles.mobileNavButton,
                  ...(hasNextStep ? {} : styles.mobileNavButtonDisabled)
                }}
                onClick={() => hasNextStep && handleStepChange(currentStepNumberValue + 1)}
                disabled={!hasNextStep}
              >
                다음
              </button>
            </div>
          </div>
          <div style={styles.stepSelectorMobile}>
            {renderStepButtons()}
          </div>
        </>
      ) : (
        <div style={styles.stepSelector}>
          {renderStepButtons()}
        </div>
      )}

      {!isMobile && (
        <div>
          <button
            type="button"
            style={{
              ...styles.mobileNavButton,
              position: 'fixed',
              bottom: 16,
              left: 16,
              right: 'auto'
            }}
            onClick={() => hasPrevStep && handleStepChange(currentStepNumberValue - 1)}
            disabled={!hasPrevStep}
          >
            ← 이전
          </button>
          <button
            type="button"
            style={{
              ...styles.mobileNavButton,
              position: 'fixed',
              bottom: 16,
              right: 16,
              left: 'auto'
            }}
            onClick={() => hasNextStep && handleStepChange(currentStepNumberValue + 1)}
            disabled={!hasNextStep}
          >
            다음 →
          </button>
        </div>
      )}

      <div style={responsiveStyle({ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }, { gap: '10px' })}>
        <span style={styles.tag} data-testid="workbook-card-counter">
          카드 {cardIndex + 1}/{currentStep.cards.length}
        </span>
        <button
          type="button"
          style={responsiveStyle(styles.secondaryButton, styles.secondaryButtonMobile)}
          data-testid="workbook-step-complete"
          onClick={handleToggleCompletion}
        >
          {isStepCompleted ? '✅ Step 완료 표시 해제' : 'Step 완료 체크'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            ...responsiveStyle(styles.flashcard, styles.flashcardMobile),
            ...(shouldLeftAlignCard ? styles.flashcardLeft : styles.flashcardCenter)
          }}
          data-testid="workbook-flashcard"
        >
          <div
            style={currentCard && (currentCard.type === 'word-order' || currentCard.type === 'word-order-input')
              ? responsiveStyle(styles.flashcardFrontInteractive, styles.flashcardFrontInteractiveMobile)
              : responsiveStyle(styles.flashcardFront, styles.flashcardFrontMobile)}
            data-testid="workbook-flashcard-front"
          >
            {renderFrontContent()}
          </div>
          {showBack && currentCard?.back && (
            <div
              style={{
                ...responsiveStyle(styles.flashcardBack, styles.flashcardBackMobile),
                ...(shouldLeftAlignCard ? { textAlign: 'left' } : { textAlign: 'center' })
              }}
              data-testid="workbook-flashcard-back"
            >
              {currentCard.back}
            </div>
          )}
        </div>
        <div style={styles.cardControls}>
          <button
            type="button"
            style={{
              ...responsiveStyle(styles.secondaryButton, styles.secondaryButtonMobile),
              ...(cardIndex === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
            }}
            onClick={handlePrevCard}
            disabled={cardIndex === 0}
          >
            이전 카드
          </button>
          <button
            type="button"
            style={responsiveStyle(styles.primaryButton, styles.primaryButtonMobile)}
            onClick={handleFlipCard}
          >
            {showBack ? '앞면 보기' : '뒷면 보기'}
          </button>
          <button
            type="button"
            style={{
              ...responsiveStyle(styles.secondaryButton, styles.secondaryButtonMobile),
              ...(cardIndex === currentStep.cards.length - 1 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
            }}
            onClick={handleNextCard}
            disabled={cardIndex === currentStep.cards.length - 1}
          >
            다음 카드
          </button>
        </div>
      </div>
      {previewPassageText && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }} onClick={() => setPreviewPassageText(null)}>
          <div style={{
            background: "var(--surface-card)",
            padding: "24px",
            borderRadius: "20px",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            border: "1px solid var(--surface-border)",
            position: "relative"
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>{previewPassageText.title}</h3>
            <div style={{ 
              whiteSpace: "pre-wrap", 
              lineHeight: 1.6, 
              color: "var(--text-primary)",
              fontSize: "16px",
              background: "var(--surface-soft)",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "20px"
            }}>
              {previewPassageText.text}
            </div>
            <button 
              type="button" 
              style={styles.primaryButton}
              onClick={() => setPreviewPassageText(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkbookPage;
