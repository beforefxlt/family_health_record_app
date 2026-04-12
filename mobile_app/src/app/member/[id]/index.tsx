import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { memberService, trendService } from '../../../api/services';
import { getLatestValue, shouldShowEmptyState } from '../../../utils';
import type { MemberProfile, VisionDashboard, GrowthDashboard, BloodDashboard } from '../../../api/models';
import { MEMBER_TYPE_LABELS, METRIC_LABELS } from '../../../constants/api';

export default function MemberDashboardPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [visionData, setVisionData] = useState<VisionDashboard | null>(null);
  const [growthData, setGrowthData] = useState<GrowthDashboard | null>(null);
  const [bloodData, setBloodData] = useState<BloodDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [memberData, vision, growth, blood] = await Promise.all([
        memberService.get(id!),
        trendService.getVisionDashboard(id!).catch(() => null),
        trendService.getGrowthDashboard(id!).catch(() => null),
        trendService.getBloodDashboard(id!).catch(() => null),
      ]);
      setMember(memberData);
      setVisionData(vision);
      setGrowthData(growth);
      setBloodData(blood);
    } catch (error) {
      console.error('Failed to load member data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);
  
  const MetricCard = ({ 
    metric, 
    title, 
    unit, 
    series 
  }: { 
    metric: string, 
    title: string, 
    unit?: string, 
    series?: any[] 
  }) => {
    const latest = getLatestValue(series || []);
    return (
      <TouchableOpacity
        style={styles.metricCard}
        onPress={() => router.push(`/member/${id}/trends?metric=${metric}`)}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.cardValue}>{latest?.value || 'N/A'}</Text>
          {unit && <Text style={styles.cardUnit}> {unit}</Text>}
        </View>
        {latest?.date && (
          <Text style={styles.cardDate}>记录于 {latest.date}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading || !member) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  const isChild = member.member_type === 'child';
  const isAdultOrSenior = member.member_type === 'adult' || member.member_type === 'senior';

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberType}>{MEMBER_TYPE_LABELS[member.member_type]}</Text>
          {member.last_check_date && (
            <Text style={styles.lastUpdate}>最后更新: {member.last_check_date}</Text>
          )}
        </View>

        {isChild && (
          <>
            <Text style={styles.sectionTitle}>近视防控</Text>
            <View style={styles.cardRow}>
              <MetricCard 
                metric="axial_length" 
                title={METRIC_LABELS.axial_length} 
                unit="mm" 
                series={visionData?.axial_length?.series} 
              />
              <MetricCard 
                metric="vision_acuity" 
                title={METRIC_LABELS.vision_acuity} 
                series={visionData?.vision_acuity?.series} 
              />
            </View>

            <Text style={styles.sectionTitle}>生长发育</Text>
            <View style={styles.cardRow}>
              <MetricCard 
                metric="height" 
                title={METRIC_LABELS.height} 
                unit="cm" 
                series={growthData?.height?.series} 
              />
              <MetricCard 
                metric="weight" 
                title={METRIC_LABELS.weight} 
                unit="kg" 
                series={growthData?.weight?.series} 
              />
            </View>
          </>
        )}

        {(isAdultOrSenior) && (
          <>
            <Text style={styles.sectionTitle}>健康指标</Text>
            <View style={styles.cardRow}>
              {(growthData?.height?.series?.length ?? 0) > 0 && (
                <MetricCard 
                  metric="height" 
                  title={METRIC_LABELS.height} 
                  unit="cm" 
                  series={growthData?.height?.series} 
                />
              )}
              {(growthData?.weight?.series?.length ?? 0) > 0 && (
                <MetricCard 
                  metric="weight" 
                  title={METRIC_LABELS.weight} 
                  unit="kg" 
                  series={growthData?.weight?.series} 
                />
              )}
              {(visionData?.axial_length?.series?.length ?? 0) > 0 && (
                <MetricCard 
                  metric="axial_length" 
                  title={METRIC_LABELS.axial_length} 
                  unit="mm" 
                  series={visionData?.axial_length?.series} 
                />
              )}
              {(visionData?.vision_acuity?.series?.length ?? 0) > 0 && (
                <MetricCard 
                  metric="vision_acuity" 
                  title={METRIC_LABELS.vision_acuity} 
                  series={visionData?.vision_acuity?.series} 
                />
              )}
            </View>

            {bloodData && (
              <>
                <Text style={styles.sectionTitle}>血检指标</Text>
                <View style={styles.cardRow}>
                  {(bloodData?.glucose?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="glucose" 
                      title={METRIC_LABELS.glucose} 
                      unit="mmol/L" 
                      series={bloodData?.glucose?.series} 
                    />
                  )}
                  {(bloodData?.tc?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="tc" 
                      title={METRIC_LABELS.tc} 
                      unit="mmol/L" 
                      series={bloodData?.tc?.series} 
                    />
                  )}
                  {(bloodData?.tg?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="tg" 
                      title={METRIC_LABELS.tg} 
                      unit="mmol/L" 
                      series={bloodData?.tg?.series} 
                    />
                  )}
                  {(bloodData?.hdl?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="hdl" 
                      title={METRIC_LABELS.hdl} 
                      unit="mmol/L" 
                      series={bloodData?.hdl?.series} 
                    />
                  )}
                  {(bloodData?.ldl?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="ldl" 
                      title={METRIC_LABELS.ldl} 
                      unit="mmol/L" 
                      series={bloodData?.ldl?.series} 
                    />
                  )}
                  {(bloodData?.hemoglobin?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="hemoglobin" 
                      title={METRIC_LABELS.hemoglobin} 
                      unit="g/L" 
                      series={bloodData?.hemoglobin?.series} 
                    />
                  )}
                  {(bloodData?.hba1c?.series?.length ?? 0) > 0 && (
                    <MetricCard 
                      metric="hba1c" 
                      title={METRIC_LABELS.hba1c} 
                      unit="%" 
                      series={bloodData?.hba1c?.series} 
                    />
                  )}
                </View>
              </>
            )}
          </>
        )}

        {member.pending_review_count > 0 && (
          <>
            <Text style={styles.sectionTitle}>待审核</Text>
            <TouchableOpacity
              style={styles.pendingCard}
              onPress={() => router.push('/review/list')}
            >
              <Text style={styles.pendingText}>待审核 ({member.pending_review_count})</Text>
              <Text style={styles.pendingButton}>去审核</Text>
            </TouchableOpacity>
          </>
        )}

        {shouldShowEmptyState(
          isChild,
          !!(visionData?.axial_length?.series?.length || visionData?.vision_acuity?.series?.length),
          !!(growthData?.height?.series?.length || growthData?.weight?.series?.length),
          member.pending_review_count
        ) && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无指标数据，请上传检查单</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.manualEntryButton}
        onPress={() => router.push(`/member/${id}/manual-entry`)}
      >
        <Text style={styles.manualEntryButtonText}>✏️ 手工录入指标</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push(`/upload?memberId=${id}`)}
      >
        <Text style={styles.addButtonText}>📷 录入新检查单</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  memberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  memberType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  cardUnit: {
    fontSize: 14,
    color: '#999',
    marginLeft: 2,
  },
  cardDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  pendingCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 16,
    color: '#856404',
  },
  pendingButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  manualEntryButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  manualEntryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
