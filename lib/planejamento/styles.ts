import { StageType } from '@/types/planejamento';

export const STAGE_STYLES = {
  [StageType.PURCHASE]: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    bar: 'bg-blue-500',
    hover: 'hover:bg-blue-100'
  },
  [StageType.CUTTING]: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-700',
    bar: 'bg-indigo-500',
    hover: 'hover:bg-indigo-100'
  },
  [StageType.PRINTING]: {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-700',
    bar: 'bg-purple-500',
    hover: 'hover:bg-purple-100'
  },
  [StageType.SEWING]: {
    bg: 'bg-pink-50',
    border: 'border-pink-300',
    text: 'text-pink-700',
    bar: 'bg-pink-500',
    hover: 'hover:bg-pink-100'
  },
  [StageType.REVISION]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    bar: 'bg-yellow-500',
    hover: 'hover:bg-yellow-100'
  },
  [StageType.PACKING]: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-700',
    bar: 'bg-orange-500',
    hover: 'hover:bg-orange-100'
  },
  [StageType.DELIVERY]: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    bar: 'bg-emerald-500',
    hover: 'hover:bg-emerald-100'
  },
};

export const getStageStyle = (type: StageType) => {
  return STAGE_STYLES[type] || {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-700',
    bar: 'bg-gray-500',
    hover: 'hover:bg-gray-100'
  };
};
