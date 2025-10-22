import { ClassDef, AscendancyDef, deriveStats } from './types';

export type CreatorState = {
  classes: ClassDef[];
  ascendancies: AscendancyDef[];
  selectedClassId: string | null;
  selectedAscendancyId: string | null;
  name: string;
};

export type Listener = (s: CreatorState) => void;

export class CreatorStore {
  private state: CreatorState;
  private listeners: Set<Listener> = new Set();

  constructor(classes: ClassDef[], ascendancies: AscendancyDef[]) {
    this.state = {
      classes,
      ascendancies,
      selectedClassId: null,
      selectedAscendancyId: null,
      name: '',
    };
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const l of this.listeners) l(this.state);
  }

  setName(name: string) {
    this.state.name = name;
    this.emit();
  }

  setClass(id: string) {
    this.state.selectedClassId = id;
    // Reset ascendancy if it no longer matches
    const asc = this.getSelectedAscendancy();
    if (asc && asc.classId !== id) this.state.selectedAscendancyId = null;
    this.emit();
  }

  setAscendancy(id: string) {
    this.state.selectedAscendancyId = id;
    this.emit();
  }

  getSelectedClass(): ClassDef | undefined {
    return this.state.classes.find(c => c.id === this.state.selectedClassId || '');
  }

  getSelectedAscendancy(): AscendancyDef | undefined {
    return this.state.ascendancies.find(a => a.id === this.state.selectedAscendancyId || '');
  }

  getFilteredAscendancies(): AscendancyDef[] {
    const cls = this.getSelectedClass();
    if (!cls) return [];
    return this.state.ascendancies.filter(a => a.classId === cls.id);
  }

  getDerivedStats() {
    const cls = this.getSelectedClass();
    const asc = this.getSelectedAscendancy();
    return cls ? deriveStats(cls.startingStats, asc?.creationBonuses) : null;
  }

  isValid(): { valid: boolean; reason?: string } {
    if (!this.state.name || this.state.name.trim().length < 1) {
      return { valid: false, reason: 'Enter a name' };
    }
    if (!this.state.selectedClassId) {
      return { valid: false, reason: 'Choose a class' };
    }
    if (!this.state.selectedAscendancyId) {
      return { valid: false, reason: 'Choose an ascendancy' };
    }
    return { valid: true };
  }
}
