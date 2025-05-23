import { Section } from './types';

/**
 * Helper functions for working with different section types
 */
export class SectionHelper {
  /**
   * Determines if a section is a header section (## level) or task group (### level)
   * @param section The section to check
   * @returns True if the section is a header section, false if it's a task group
   */
  static isHeaderSection(section: Section): boolean {
    return section.isHeader === true;
  }

  /**
   * Gets a CSS class for a section based on its type
   * @param section The section to get a class for
   * @returns A CSS class name
   */
  static getSectionClass(section: Section): string {
    return this.isHeaderSection(section) ? 'blog-header-section' : 'task-group-section';
  }
}
