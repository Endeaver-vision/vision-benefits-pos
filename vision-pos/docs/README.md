# Vision Benefits POS - Documentation

This directory contains all reference documentation for the Vision Benefits POS system development.

## 📁 Directory Structure

```
docs/
├── README.md (this file)
├── planning/
│   ├── VISION_POS_MASTER_PLAN.md
│   ├── 4_week_roadmap_comprehensive.txt
│   └── VISION_POS_4_WEEK_ROADMAP_summary.md
├── insurance-schemas/
│   ├── vsp_dynamic_schema_v1.md
│   ├── eyemed_dynamic_schema_v1.md
│   └── spectera_dynamic_schema_v3.md
└── manuals/
    ├── VSP_All_Manuals_and_Tiers_Consolidated.txt
    ├── Eyemed_tiers_manual.consolidated_.txt
    └── Spectera_Consolidated_Tiers_and_Manual2025.txt
```

## 📋 Document Categories

### Planning Documents
- **Master Plan**: Complete project vision, features, and specifications
- **4-Week Roadmap**: Detailed development timeline and deliverables
- **Roadmap Summary**: Condensed version of development plan

### Insurance Schemas
- **VSP Schema**: Dynamic pricing schema for VSP benefits
- **EyeMed Schema**: Dynamic pricing schema for EyeMed benefits  
- **Spectera Schema**: Dynamic pricing schema for Spectera benefits

### Insurance Manuals
- **VSP Manual**: Official provider manual and tier classifications
- **EyeMed Manual**: Official provider manual and tier classifications
- **Spectera Manual**: Official provider manual and tier classifications

## 🎯 Quick Reference

### Current Development Status
- **Week 1, Day 1**: ✅ Complete - Project foundation established
- **Week 1, Day 2**: 🚧 In Progress - Database schema & core tables

### Key Architecture Decisions
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js 14+ with TypeScript
- **State Management**: Zustand + TanStack Query
- **UI Components**: shadcn/ui + Tailwind CSS
- **Authentication**: NextAuth.js (planned)

### Insurance Carriers Supported
- VSP (Vision Service Plan)
- EyeMed
- Spectera

## 📚 How to Use This Documentation

1. **For Development**: Reference schemas and manuals during coding
2. **For Testing**: Use tier classifications to validate pricing calculations
3. **For Planning**: Refer to roadmap for next steps and deliverables
4. **For Business Logic**: Use master plan for feature requirements

## 🔄 Document Updates

When updating documents:
1. Keep version numbers in filenames
2. Update this README if structure changes
3. Commit changes with descriptive messages
4. Update project documentation as needed

---

**Last Updated**: November 3, 2025  
**Project**: Vision Benefits POS v1.0  
**Status**: Week 1 Development Phase