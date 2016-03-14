class EverythingClosedPeriod < ActiveRecord::Base

  attr_accessible :message, :closed_from, :closed_to

  validates :message, presence: true
  validates :closed_from, presence: true
  validates :closed_to, presence: true
  validate :times_in_valid_order

  scope :active_closed_periods, -> { where("closed_from <= ? AND closed_to >= ?", DateTime.current, DateTime.current) }
  scope :current_and_future_closed_times, -> { where("closed_to >= ?", DateTime.current) }

  def self.current_period
    active_closed_periods.first
  end

  def times_in_valid_order
    unless closed_from < closed_to
      errors.add(:closed_to, I18n.t('everything_closed_periods.times_in_valid_order'))
    end
  end

end
